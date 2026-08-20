# Query Store analysis

Query Store is the preferred source for historical plan and runtime evidence when it is enabled and
capturing the affected workload.

## Interpret the history

- Compare explicit baseline and affected windows. Do not mix intervals from materially different
  workloads into one average.
- Weight averages by execution count and inspect tails or interval variance when the server exposes
  them. A fast frequent execution can hide a rare severe regression.
- A new plan near the regression boundary is evidence of correlation, not proof of causation.
- The same plan in both windows is evidence against a plan-change regression, not against a query
  regression. A large same-plan increase in logical reads and CPU usually means a different parameter
  or data shape is doing more work through the same operators.
- Multiple plans can be legitimate, especially for parameter-sensitive workloads and SQL Server
  versions that support Parameter Sensitive Plan optimization.
- Match plans to runtime statistics and waits. Do not infer runtime behavior from plan XML alone.
- Record Query Store state, capture gaps, cleanup boundaries, and read-only/error states.

## Parameter sensitivity

Look for materially different performance or row counts across parameter shapes, recurring plan
switches, dispatcher/query variants, and estimates that are accurate for one distribution but poor
for another. Do not label every multi-plan query as parameter sniffing.

Before suggesting `RECOMPILE`, `OPTIMIZE FOR`, plan forcing, or Query Store hints, consider frequency,
compile cost, data skew, SQL Server version and compatibility level, and whether an application or
index change addresses the underlying cause more safely.

## Mutating controls

Plan forcing, unforcing, Query Store hints, capture-policy changes, and Query Store configuration are
mutations. The diagnostic workflow may recommend them with evidence, validation, and rollback, but
must not apply them without separate authorization.

Microsoft references:

- https://learn.microsoft.com/sql/relational-databases/performance/tune-performance-with-the-query-store
- https://learn.microsoft.com/sql/relational-databases/performance/parameter-sensitive-plan-optimization
- https://learn.microsoft.com/sql/relational-databases/performance/query-store-hints
