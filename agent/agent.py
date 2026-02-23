"""Database Q&A agent that generates SQL queries to answer natural language questions."""

import sqlite3
from typing import Any

from sik_llms import (
    Parameter,
    RegisteredClients,
    Tool,
    ToolChoice,
    create_client,
    system_message,
    user_message,
)

from agent.database import SCHEMA_DESCRIPTION, create_database, execute_query

_PROVIDER_TO_CLIENT = {
    "anthropic": RegisteredClients.ANTHROPIC_TOOLS,
    "openai": RegisteredClients.OPENAI_TOOLS,
}

_GENERATE_SQL_TOOL = Tool(
    name="generate_sql",
    description="Generate a SQL query to answer the user's question about the database.",
    parameters=[
        Parameter(
            name="sql",
            param_type=str,
            required=True,
            description="The SQL query to execute against the database.",
        ),
    ],
)

_SQL_SYSTEM_PROMPT = (
    "You are a database assistant. Given a natural language question, "
    "generate a SQL query to answer it.\n\n"
    f"{SCHEMA_DESCRIPTION}\n"
    "Rules:\n"
    "- Generate only SELECT queries.\n"
    "- Use the generate_sql tool to provide your SQL query.\n"
    "- Write clear, correct SQL that answers the user's question."
)

_RESPONSE_SYSTEM_PROMPT = (
    "You are a helpful assistant. Given a question, a SQL query, "
    "and the query results, provide a clear natural language answer.\n\n"
    "Be concise and directly answer the question using the data provided. "
    "If the query returned an error, explain what went wrong."
)


async def run_agent(
    question: str,
    model_name: str,
    provider: str,
    temperature: float = 0.0,
    db_conn: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    """
    Run the database Q&A agent.

    Phase 1: Use a tools client to generate SQL from the question.
    Phase 2: Execute the SQL and generate a natural language response.

    Args:
        question: Natural language question about the database.
        model_name: LLM model name.
        provider: Provider name ("anthropic" or "openai").
        temperature: Sampling temperature.
        db_conn: Optional SQLite connection. Creates one if not provided.

    Returns:
        Dict with tool_predictions, sql_query, query_result, response, and usage.
    """
    owns_conn = db_conn is None
    if db_conn is None:
        db_conn = create_database()

    try:
        # Phase 1: Generate SQL via tool calling
        client_type = _PROVIDER_TO_CLIENT[provider]
        tools_client = create_client(
            model_name=model_name,
            client_type=client_type,
            tools=[_GENERATE_SQL_TOOL],
            tool_choice=ToolChoice.REQUIRED,
            temperature=temperature,
        )
        tool_result = await tools_client.run_async(
            messages=[
                system_message(_SQL_SYSTEM_PROMPT),
                user_message(question),
            ],
        )

        tool_predictions = [
            {"tool_name": pred.name, "arguments": pred.arguments}
            for pred in tool_result.tool_predictions
        ]
        sql_query = (
            tool_result.tool_predictions[0].arguments["sql"]
            if tool_result.tool_predictions
            else ""
        )

        # Phase 2: Execute SQL and generate response
        query_result = execute_query(db_conn, sql_query)
        query_success = "error" not in query_result

        text_client = create_client(model_name=model_name, temperature=temperature)
        response_result = await text_client.run_async(
            messages=[
                system_message(_RESPONSE_SYSTEM_PROMPT),
                user_message(
                    f"Question: {question}\n\n"
                    f"SQL Query: {sql_query}\n\n"
                    f"Query Result: {query_result}"
                ),
            ],
        )

        # Combine usage from both calls
        usage = {
            "input_tokens": tool_result.input_tokens + response_result.input_tokens,
            "output_tokens": tool_result.output_tokens + response_result.output_tokens,
            "input_cost": (tool_result.input_cost or 0) + (response_result.input_cost or 0),
            "output_cost": (tool_result.output_cost or 0) + (response_result.output_cost or 0),
            "total_cost": (tool_result.total_cost or 0) + (response_result.total_cost or 0),
            "duration_seconds": tool_result.duration_seconds + response_result.duration_seconds,
        }

        return {
            "tool_predictions": tool_predictions,
            "prediction_count": len(tool_predictions),
            "sql_query": sql_query,
            "query_result": query_result,
            "query_success": query_success,
            "response": response_result.response,
            "usage": usage,
        }
    finally:
        if owns_conn:
            db_conn.close()
