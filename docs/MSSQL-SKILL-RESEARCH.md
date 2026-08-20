# Online research behind the MSSQL skills

Research date: 2026-08-19

These LibreChat deployment skills are MSSQL-specific adaptations, not verbatim copies. The source
skills were used to identify useful workflow structure and coverage; Microsoft documentation remains
the authority for SQL Server behavior.

## Sources reviewed

### GitHub Awesome Copilot: SQL optimization and SQL code review

- Directory entries: [SQL optimization on mcpservers.org](https://mcpservers.org/agent-skills/github/sql-optimization)
  and [SQL code review on mcpservers.org](https://mcpservers.org/agent-skills/github/sql-code-review)
- Primary sources: [sql-optimization](https://github.com/github/awesome-copilot/blob/main/skills/sql-optimization/SKILL.md)
  and [sql-code-review](https://github.com/github/awesome-copilot/blob/main/skills/sql-code-review/SKILL.md)
- License: [MIT](https://github.com/github/awesome-copilot/blob/main/LICENSE)

Adopted: broad coverage of query structure, SARGability, joins, pagination, batching, indexes,
security, maintainability, and an actionable per-finding review format.

Changed or rejected: examples mixing incompatible dialects; automatic index conclusions; fixed rules
for join order, `IN` versus `EXISTS`, or `OR` versus `UNION ALL`; fragmentation as a default diagnosis;
subjective numeric review scores; and unmeasured claims of expected percentage improvement. In SQL
Server these are workload- and plan-dependent hypotheses.

### PlanetScale database skills: MySQL

- Directory entry: [MySQL skill on mcpservers.org](https://mcpservers.org/agent-skills/planetscale/mysql)
- Primary source: [mysql/SKILL.md](https://github.com/planetscale/database-skills/blob/main/skills/mysql/SKILL.md)
- License: [MIT](https://github.com/planetscale/database-skills/blob/main/LICENSE)

Adopted: define workload and constraints first, read only relevant references, prefer the smallest
change, validate with evidence, and include rollback plus post-change verification.

Rejected: MySQL/InnoDB-specific schema, optimizer, locking, character-set, and operational advice.
Those rules were not translated mechanically to SQL Server.

### Anthropic knowledge-work plugins: write-query

- Directory entry: [write-query on mcpservers.org](https://mcpservers.org/agent-skills/anthropic/write-query)
- Primary source: [write-query/SKILL.md](https://github.com/anthropics/knowledge-work-plugins/blob/main/data/skills/write-query/SKILL.md)
- License: [Apache-2.0](https://github.com/anthropics/knowledge-work-plugins/blob/main/LICENSE)

Adopted: make the requested result contract explicit, discover schema through connected tools, check
for reusable views, return copyable SQL first, and explain parameters, logical sections, performance
considerations, and safe modification points.

Changed: the multi-dialect workflow is fixed to T-SQL. Warehouse clustering guidance becomes
SQL Server-specific inspection of indexes and partitioning. Execution is never merely offered: it
requires a separate request, authorization, and a confirmed safe environment.

## SQL Server authorities used

- [Tune performance with Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/tune-performance-with-the-query-store)
- [Parameter Sensitive Plan optimization](https://learn.microsoft.com/en-us/sql/relational-databases/performance/parameter-sensitive-plan-optimization)
- [Query Store hints](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-hints)
- [Display an actual execution plan](https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-an-actual-execution-plan)

These sources drive the Query Store, parameter sensitivity, permission, plan, and mutation boundaries.
The diagnostic MCP must expose bounded evidence; a skill never widens the user's database permissions.
