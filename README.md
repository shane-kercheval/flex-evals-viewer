# flex-evals-viewer

Template repository showing how to use [flex-evals](https://github.com/shanekercheval/flex-evals) to evaluate LLM-based agents, with a web viewer for exploring results.

## Overview

This repo contains:

- **`agent/`** — A simple Q&A agent using `sik-llms`
- **`evals/`** — Evaluation tests, YAML config, and utilities using `flex-evals`
- **`viewer/`** — React + Express app for viewing eval results

## Setup

```bash
# Install Python dependencies
make install

# Install dev dependencies (pytest, ruff, etc.)
make install-dev
```

Create a `.env` file with your API keys:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Running Evals

```bash
make evals
```

This runs the Q&A agent evaluation across multiple models (Claude Haiku 4.5 and GPT-4o-mini) and saves JSON results to `evals/results/`.

## Viewing Results

```bash
# Install viewer dependencies (first time only)
make eval-viewer-install

# Start the viewer
make eval-viewer
```

Open http://localhost:5174 to browse eval runs with filtering, drill-down, and check detail views.

## Project Structure

```
agent/agent.py          # Simple Q&A agent (run_agent function)
evals/agent_evals.yaml  # Test cases, checks, and model configs
evals/test_agent.py     # Pytest test file with @evaluate decorator
evals/utils.py          # YAML loading and config helpers
evals/conftest.py       # Loads .env for API keys
viewer/                 # React + Express eval results viewer
```

## How It Works

1. **Agent**: `run_agent()` takes a question and model name, sends it to the LLM, and returns the response with usage stats.

2. **Eval Config** (`agent_evals.yaml`): Defines test cases (questions + expected phrases), checks (contains check with JSONPath), and model configs.

3. **Test File** (`test_agent.py`): Uses the `@evaluate` decorator from `flex-evals` to run each test case multiple times (samples) and validate success rates against a threshold.

4. **Viewer**: Express server reads JSON result files; React frontend renders runs list, summary matrix, test case drill-down, and check details.

## Linting

```bash
make lint
```
