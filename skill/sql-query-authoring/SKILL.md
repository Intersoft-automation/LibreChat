---
name: sql-query-authoring
description: Use when the user asks to write, generate, extend, or rewrite T-SQL for Microsoft SQL Server — a query, view, function, or stored procedure — including turning a reporting or business requirement into SQL and reshaping supplied SQL to meet a new requirement. When the request is to judge T-SQL that already exists use sql-code-review; when it is to explain observed slowness or a regression use mssql-performance.
user-invocable: true
disable-model-invocation: false
always-apply: false
version: "0.3.0"
compatibility: LibreChat SQL Programmer agent; authorized schema inspection tools are optional
---

# SQL Query Authoring

Write T-SQL against verified schema facts, not against a plausible-looking schema. An invented column
name costs more than a clarifying question.

Read [references/authoring-guide.md](references/authoring-guide.md) with the `read_file` tool before
authoring anything involving joins, aggregation, window functions, pagination, dynamic SQL,
transactions, or writes. A single-table projection with an explicit column list does not need it.

## Workflow

1. Establish output columns, filters, aggregations, joins, ordering, result limits, inputs, expected
   cardinality, read/write behavior, reuse pattern, and the required correctness edge cases.
2. Confirm the database, and the SQL Server version or compatibility level when it changes what is
   available. Do not import syntax or optimization advice from another SQL dialect.
3. Inspect the real columns, types, nullability, keys, relationships, constraints, indexes,
   partitioning, and any suitable existing view when authorized tools are available. Never invent a
   schema fact, and do not rebuild an existing supported abstraction without a reason.
4. Choose a simple set-based shape with an explicit column list and typed parameters. Get correctness
   right before optimizing anything speculative.
5. State the assumptions you could not resolve and give a bounded validation plan covering the edge
   cases from step 1.

When schema inspection is unavailable, say which facts you assumed, mark them clearly in the answer,
and choose the shape that fails loudly rather than the one that silently returns wrong rows.

Do not execute the generated SQL or apply any database change unless the user separately requests and
authorizes it in a confirmed safe environment.

## Output

1. The T-SQL, copyable, before any commentary.
2. Parameters and caller expectations.
3. A short section-by-section explanation for non-trivial queries only.
4. Schema assumptions, clearly labeled as assumptions.
5. Correctness tests, including the empty, duplicate, `NULL`, and boundary cases.
6. Performance notes that separate facts learned from metadata or plans from hypotheses.
7. The safest places to modify it later — date range, grouping level, filters, page size.

Answer in the user's language, but keep SQL identifiers, keywords, and comments in the form the
database and the team already use.
