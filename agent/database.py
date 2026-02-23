"""SQLite in-memory e-commerce database for agent evaluation."""

import sqlite3
from typing import Any

SCHEMA_DESCRIPTION = """
Database Schema:
- customers(id INTEGER PRIMARY KEY, name TEXT, email TEXT, country TEXT, created_at TEXT)
- products(id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)
- orders(id INTEGER PRIMARY KEY, customer_id INTEGER FK->customers, product_id INTEGER FK->products, quantity INTEGER, total REAL, status TEXT, order_date TEXT)
"""  # noqa: E501

_SCHEMA_SQL = """
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    order_date TEXT NOT NULL
);
"""

_SEED_SQL = """
INSERT INTO customers (id, name, email, country, created_at) VALUES
    (1, 'Alice Johnson', 'alice@example.com', 'United States', '2024-01-15'),
    (2, 'Bob Smith', 'bob@example.com', 'United Kingdom', '2024-02-20'),
    (3, 'Carlos Garcia', 'carlos@example.com', 'Spain', '2024-03-10'),
    (4, 'Diana Chen', 'diana@example.com', 'China', '2024-04-05'),
    (5, 'Eva Mueller', 'eva@example.com', 'Germany', '2024-05-12'),
    (6, 'Frank Wilson', 'frank@example.com', 'United States', '2024-06-18'),
    (7, 'Grace Kim', 'grace@example.com', 'South Korea', '2024-07-22'),
    (8, 'Hassan Ali', 'hassan@example.com', 'United States', '2024-08-30');

INSERT INTO products (id, name, category, price, stock) VALUES
    (1, 'Laptop Pro', 'Electronics', 1299.99, 50),
    (2, 'Wireless Mouse', 'Electronics', 29.99, 200),
    (3, 'Running Shoes', 'Sports', 89.99, 100),
    (4, 'Python Cookbook', 'Books', 49.99, 75),
    (5, 'Coffee Maker', 'Home', 159.99, 30),
    (6, 'Yoga Mat', 'Sports', 24.99, 150);

INSERT INTO orders (id, customer_id, product_id, quantity, total, status, order_date) VALUES
    (1, 1, 1, 1, 1299.99, 'completed', '2025-01-05'),
    (2, 1, 2, 2, 59.98, 'completed', '2025-01-10'),
    (3, 2, 3, 1, 89.99, 'completed', '2025-01-15'),
    (4, 3, 4, 3, 149.97, 'pending', '2025-01-20'),
    (5, 4, 1, 1, 1299.99, 'completed', '2025-01-25'),
    (6, 5, 5, 2, 319.98, 'shipped', '2025-02-01'),
    (7, 6, 6, 1, 24.99, 'completed', '2025-02-05'),
    (8, 2, 2, 5, 149.95, 'pending', '2025-02-10'),
    (9, 7, 3, 2, 179.98, 'completed', '2025-02-15'),
    (10, 8, 4, 1, 49.99, 'shipped', '2025-02-20'),
    (11, 1, 5, 1, 159.99, 'pending', '2025-03-01'),
    (12, 4, 6, 3, 74.97, 'completed', '2025-03-05');
"""


def create_database() -> sqlite3.Connection:
    """Create an in-memory SQLite database with schema and seed data."""
    conn = sqlite3.connect(":memory:")
    conn.executescript(_SCHEMA_SQL)
    conn.executescript(_SEED_SQL)
    return conn


def execute_query(conn: sqlite3.Connection, sql: str) -> dict[str, Any]:
    """
    Execute a SQL query and return the results.

    Returns:
        Dict with columns, rows, and row_count on success,
        or error message on failure.
    """
    try:
        cursor = conn.execute(sql)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [list(row) for row in cursor.fetchall()]
        return {"columns": columns, "rows": rows, "row_count": len(rows)}
    except Exception as e:
        return {"error": str(e)}
