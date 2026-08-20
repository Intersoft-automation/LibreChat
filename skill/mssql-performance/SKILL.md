---
name: mssql-performance
description: Use when a Microsoft SQL Server query, procedure, view, or report is slow, times out, blocks, regressed, or has unstable duration — plan changes, parameter sniffing, spills, unexpected reads or CPU — or when deciding whether an index or a statistics change would help a real workload. To critique T-SQL with no runtime evidence use sql-code-review; to write new T-SQL use sql-query-authoring.
user-invocable: true
disable-model-invocation: false
always-apply: false
version: "0.4.0"
compatibility: LibreChat SQL Programmer agent with authorized mssql-diagnostics MCP tools
---

# MSSQL Performance

Work from evidence. A generic tuning checklist is not a diagnosis, and a plausible cause you did not
observe is a hypothesis, not a finding.

References live beside this file. Load one with the `read_file` tool using the path as written, for
example `references/query-store.md`. Read
[references/evidence-tools.md](references/evidence-tools.md) before the first diagnostic call: it maps
each question to the smallest call that answers it, states the paging and artifact rules, and shows a
complete worked diagnosis.

## Workflow

1. **Frame.** Establish database, object or query, symptom, affected time window, expected behavior,
   how the object is called, the latency target, and the SQL Server version or compatibility level
   when it changes the answer. Resolve an ambiguous name first; never silently pick among similarly
   named objects or databases. A pasted SQL statement is a query target, not an object-name search:
   identify it by Query Store ID, hash, or two to three stable text anchors before reading history.
   A numbered Delphi report goes directly to `diagnose_report_regression`.
2. **Overview.** Assemble the bounded object or procedure overview before deep inspection. Inspect
   object metadata only to resolve the target, its dependencies, or one specific uncertainty.
3. **History before plans.** Read Query Store history before treating any single plan as
   representative. Compare an affected window against a baseline: executions, duration, CPU, logical
   reads, how many plans existed and when each was active, waits.
4. **Plans progressively.** summary → warnings → operators → predicates, and a bounded XML fragment
   only when the normalized views cannot answer the question.
5. **Rank hypotheses.** For each leading cause record supporting evidence, contradicting evidence, and
   the next bounded observation that would disprove it. Stop collecting once the evidence separates
   the leading cause from its rivals.
6. **Recommend.** The smallest reversible change that addresses the demonstrated cause, with
   validation, risk, and rollback. Do not apply it.

Read [references/diagnostic-workflow.md](references/diagnostic-workflow.md) for the detailed evidence
sequence, then only the specialized reference you need next:

- [references/query-store.md](references/query-store.md) — regressions, multiple plans, runtime
  distributions, waits, parameter sensitivity.
- [references/plan-analysis.md](references/plan-analysis.md) — plan evidence, estimates, spills,
  conversions, lookups, indexes, statistics.
- [references/query-optimization.md](references/query-optimization.md) — query shape, joins,
  predicates, pagination, batching, evidence-based index design.
- [references/safety-and-output.md](references/safety-and-output.md) — before proposing any change,
  and for the full answer structure and the validation metric set.

## Red flags

Each of these is a shortcut past the evidence. When one occurs to you, do the third column before you
say the first.

| Shortcut | What it skips | Do instead |
| --- | --- | --- |
| "Classic parameter sniffing." | Whether behavior actually differs by parameter shape | Compare per-plan runtime and row counts across windows in Query Store |
| "The missing-index hint says to add this index." | Existing and overlapping indexes, write cost, the whole workload | Inspect current indexes first, then justify key order, includes, and cost |
| "There is a scan, that is the problem." | Rows required, selectivity, measured reads | Tie the operator to its measured share of reads, CPU, or elapsed time |
| "Statistics are stale, update them." | Whether an estimate is actually wrong, and where | Show the estimate/actual gap and the operator choice it changes |
| "Let me rewrite this more cleanly." | The result contract | Prove the rewrite preserves rows, duplicates, ordering, and `NULL` behavior |
| "Query Store returned nothing, so here is a checklist." | Why the evidence is missing | Report the gap, name what it prevents concluding, request the smallest next slice |
| "The plan did not change, so SQL is not the cause." | Runtime variance within the same plan | Compare reads, CPU and duration across windows; large same-plan variance points toward parameter or data sensitivity |

Never state a metric, plan ID, wait type, or row count that did not come from a tool result. If a
number matters and you do not have it, say so and name the call that would produce it.

## Boundaries

- Treat every connected database as production unless a tool result proves otherwise.
- Use only authorized read-only diagnostic tools. Never execute a stored procedure merely to obtain an
  actual plan.
- Do not force plans, set Query Store hints, update statistics, create indexes, clear caches, or run
  benchmarks without explicit authorization and a confirmed safe environment.
- Do not request complete plan XML or unbounded history when a summary or a page is enough.
- If Query Store, a DMV, or a permission is unavailable, continue with the remaining evidence and name
  the resulting uncertainty.

Answer in the user's language. Return symptom, observed evidence, likely cause with confidence,
alternative causes, recommendation, validation, risk and rollback, and missing evidence.
