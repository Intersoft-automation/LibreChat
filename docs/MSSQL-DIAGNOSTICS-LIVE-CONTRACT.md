# Live mssql-diagnostics MCP contract

Verified: 2026-08-19

Discovery path:

```text
mssql-diagnostics child MCP -> MCP Hub -> tools/list
```

The live source is registered as `mssql-diagnostics`. Discovery performed only MCP initialization and
`tools/list`; it did not invoke a database tool. Hub prefixing preserves the source hyphen. LibreChat
then appends `_mcp_intersoft-mcp` because the configured MCP server is named `intersoft-mcp`.

Every tool advertises:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": true
}
```

## Tools

### `mssql-diagnostics_search_database_objects`

- LibreChat key: `mssql-diagnostics_search_database_objects_mcp_intersoft-mcp`
- Required: `pattern: string`
- Optional: `object_kinds: string[] | null = null`, `limit: integer = 25`
- Server-enforced kinds: `table`, `view`, `procedure`, `function`; result limit is hard bounded.

### `mssql-diagnostics_inspect_database_object`

- LibreChat key: `mssql-diagnostics_inspect_database_object_mcp_intersoft-mcp`
- Required: `qualified_name: string`
- Large sanitized module definitions become expiring artifacts.

### `mssql-diagnostics_diagnose_procedure`

- LibreChat key: `mssql-diagnostics_diagnose_procedure_mcp_intersoft-mcp`
- Required: `qualified_name: string`
- Returns bounded evidence and explicit partial-capability warnings.

### `mssql-diagnostics_get_query_history`

- LibreChat key: `mssql-diagnostics_get_query_history_mcp_intersoft-mcp`
- Optional: `qualified_name: string | null = null`, `limit: integer = 10`
- Reads bounded Query Store and optional cached-DMV history.

### `mssql-diagnostics_get_plan_detail`

- LibreChat key: `mssql-diagnostics_get_plan_detail_mcp_intersoft-mcp`
- Required: `plan_id: string`
- Optional: `view: string = "summary"`, `cursor: string | null = null`,
  `page_size: integer = 25`
- Supported live server views: `summary`, `operators`, `warnings`, `predicates`, `xml_chunk`.
- Complete plan XML is never returned in one result.

### `mssql-diagnostics_get_artifact_chunk`

- LibreChat key: `mssql-diagnostics_get_artifact_chunk_mcp_intersoft-mcp`
- Required: `artifact_id: string`
- Optional: `cursor: string | null = null`, `max_bytes: integer = 12000`
- Artifact ownership and database target are revalidated on each read; cursors are opaque.

## Result and safety contract

- Results are bounded JSON serialized in standard MCP text content.
- One result is capped at 32 KiB; artifact chunks are capped at 12,000 UTF-8 bytes.
- Tools run through the diagnostic read-only profile and its read-only SQL session.
- Missing Query Store/DMV permissions produce partial results rather than permission escalation.
- Artifact IDs are process-local and expire; a service restart invalidates them.
- Tool annotations are useful metadata, not an authorization boundary. Hub role filtering, the
  LibreChat agent ACL, and the per-user SQL login remain independent controls.
