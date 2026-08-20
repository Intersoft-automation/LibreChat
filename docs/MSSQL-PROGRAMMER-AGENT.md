# MSSQL Programmer Agent

## Objective

Provide a restricted LibreChat agent that can author and review T-SQL and diagnose SQL Server
performance using read-only evidence. Large Query Store and plan artifacts remain inside the MCP
service and are retrieved progressively through bounded tools.

The first release does not execute stored procedures, benchmark production workloads, apply DDL or
DML, force plans, set Query Store hints, update statistics, deploy changes, or orchestrate approvals.

The workflow and review format were adapted after an online comparison of established database
skills. See [MSSQL-SKILL-RESEARCH.md](MSSQL-SKILL-RESEARCH.md) for sources, licenses, adopted patterns,
and deliberately rejected generic advice.

## Runtime composition

```text
User
  -> LibreChat MSSQL Programmer Agent
       -> deployment skills
            - mssql-performance
            - sql-code-review
            - sql-query-authoring
       -> baseline MCP tools from the restricted mssql-diagnostics source
            -> per-user SQL login
            -> read-only metadata, Query Store, plans, and DMV evidence
            -> identity-scoped temporary artifact store
```

Skills contain decision guidance. They do not grant tools or permissions. All diagnostic tools must
be present in the agent's baseline tool set before a turn begins.

## Live MCP capabilities

The contract was verified on 2026-08-19 through the running Hub `tools/list` path. The Hub source is
`mssql-diagnostics`; all six tools advertise `readOnlyHint: true`, `destructiveHint: false`, and
`idempotentHint: true`. No database tool was invoked during contract discovery.

| Hub tool name | LibreChat agent tool key | Purpose |
| --- | --- | --- |
| `mssql-diagnostics_search_database_objects` | `mssql-diagnostics_search_database_objects_mcp_intersoft-mcp` | Resolve an object without broad catalog export. |
| `mssql-diagnostics_inspect_database_object` | `mssql-diagnostics_inspect_database_object_mcp_intersoft-mcp` | Return bounded definition, schema, dependencies, indexes, and statistics metadata. |
| `mssql-diagnostics_diagnose_procedure` | `mssql-diagnostics_diagnose_procedure_mcp_intersoft-mcp` | Assemble a small overview with evidence, warnings, plan IDs, and artifact IDs. |
| `mssql-diagnostics_get_query_history` | `mssql-diagnostics_get_query_history_mcp_intersoft-mcp` | Return bounded Query Store and optional cached-DMV history. |
| `mssql-diagnostics_get_plan_detail` | `mssql-diagnostics_get_plan_detail_mcp_intersoft-mcp` | Return a paged summary, operators, warnings, predicates, or bounded XML chunk. |
| `mssql-diagnostics_get_artifact_chunk` | `mssql-diagnostics_get_artifact_chunk_mcp_intersoft-mcp` | Read an opaque, identity/target-scoped artifact chunk with TTL enforcement. |

LibreChat persists MCP agent tools using `{toolName}_mcp_{serverName}`. The exact live schemas and
defaults are recorded in [MSSQL-DIAGNOSTICS-LIVE-CONTRACT.md](MSSQL-DIAGNOSTICS-LIVE-CONTRACT.md).
Reconfirm the keys from LibreChat after every Hub source rename or MCP server rename.

Do not declare these keys in skill `allowed-tools`: a model-invoked skill cannot add tools after the
agent graph starts. Attach them directly to the agent.

## Suggested agent instructions

```text
You are an internal Microsoft SQL Server programmer. Use the available skills to choose the workflow:
- observed slowness, regression, blocking, unstable plans, Query Store, indexes or statistics -> mssql-performance;
- review of existing T-SQL -> sql-code-review;
- creation or revision of T-SQL -> sql-query-authoring.

Treat connected databases as production unless a tool explicitly proves otherwise. Use only bounded
read-only diagnostic tools. Never execute a stored procedure to obtain an actual plan and never apply
SQL, index, statistics, Query Store, deployment or configuration changes without a separate explicit
authorization. Separate observed evidence from hypotheses. When evidence is incomplete, say what is
missing and request the smallest next diagnostic slice. Answer in the user's language.
```

## Access boundary

Use three independent controls:

1. Share the LibreChat agent only with the approved SQL developer/DBA group.
2. Enable Hub role-based filtering on the `mssql-diagnostics` source and allow only the six diagnostic
   capabilities for that group. The default role must not match them. Until that role exists, keep
   the LibreChat agent private and do not treat agent visibility as the final security boundary.
3. Preserve per-user MSSQL credentials. Grant the database user only scoped metadata and performance
   visibility needed by the tools. Prefer `VIEW DATABASE PERFORMANCE STATE` on SQL Server 2022 and
   later where it covers the required views; use `VIEW DATABASE STATE` only when required by the
   deployed SQL Server version. Add `VIEW DEFINITION` only at the necessary database/schema/object
   scope. Do not grant `VIEW SERVER STATE` unless an accepted capability proves it necessary.

Tool filtering is not the database security boundary. A direct call denied by the profile or Hub must
also fail under the SQL login's permissions.

## LibreChat configuration checklist

- Skills capability enabled for the agents endpoint and selected model/agent.
- Deployment skills directory resolves to the checked-in `skill/` directory.
- `mssql-performance`, `sql-code-review`, and `sql-query-authoring` load at startup.
- Skills are not `always-apply` and declare no `allowed-tools`.
- Diagnostic MCP source is reachable through the existing internal gateway; no public endpoint.
- Exact diagnostic tool keys are attached to the SQL Programmer agent.
- Agent ACL is restricted to the approved group.
- A non-member cannot discover or call the diagnostic tools.
- A permitted user can diagnose a known procedure and page a plan artifact without receiving full XML.
- Cross-user and expired artifact reads fail.

## Acceptance scenario

For the request "Procedure ABC regressed from about two seconds to thirty seconds this week; find the
cause":

1. The agent invokes `mssql-performance` and resolves the explicit database/object.
2. `diagnose_procedure` returns a bounded summary and opaque plan IDs.
3. The agent compares the affected window with a baseline through `get_query_history`.
4. It requests only relevant plan views or pages.
5. The answer identifies observed evidence, confidence, alternatives, a reversible recommendation,
   before/after validation, risk, and rollback.
6. No procedure, actual-plan capture, mutation, deployment, or public download occurs.

## Deployment boundary

The canonical production deployment lives in `C:\INTERSOFT\deploy`. Repository Compose files are
historical or development inputs and must not be used against production. Validate the LibreChat unit
through its guarded deployment workflow only when deployment is explicitly authorized.
