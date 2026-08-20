# Deployment Skills

Place shared deployment skills in this directory. Each skill should live in its own folder with a
`SKILL.md` file, for example:

```text
skill/
  my-shared-skill/
    SKILL.md
    references/
      notes.md
```

These skills are loaded at server startup, exposed read-only to all users with Skills enabled, and
are not persisted as Skill documents in MongoDB.

The checked-in catalog currently includes:

- `mssql-performance` for evidence-based SQL Server performance diagnosis;
- `sql-code-review` for reviewing existing T-SQL without executing it;
- `sql-query-authoring` for writing new schema-aware T-SQL.

The skills intentionally do not declare `allowed-tools`. Agents that use them must receive their
authorized MCP tools in the agent's baseline tool set before a turn starts.

Only `name` and `description` reach the model before a skill is invoked: the runtime injects that pair
as the catalog and loads the body only when the skill is selected. Keep each `description` in the
"Use when ..." form, carrying the triggering symptoms plus the boundary against the sibling skills —
a description that summarizes what the skill does gives the model enough to answer without ever
reading it. Skill bodies reference their own `references/*.md`, which the model loads on demand with
`read_file`; that path does not require code execution to be enabled.

The online source comparison and MSSQL-specific adaptation decisions are documented in
[`docs/MSSQL-SKILL-RESEARCH.md`](../docs/MSSQL-SKILL-RESEARCH.md).
