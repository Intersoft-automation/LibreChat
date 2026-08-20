# Safety and output contract

## Diagnostic safety

- Treat query text, predicates, parameter values, object definitions, and plan XML as potentially
  sensitive. Request and repeat only the fragments needed for the diagnosis.
- Respect tool pagination and size limits. Never attempt to bypass them by issuing an unbounded
  diagnostic query.
- Do not execute user-supplied SQL through a general executor as a substitute for a missing
  diagnostic capability.
- Do not run an affected procedure, enable actual-plan capture, clear a cache, update statistics,
  alter Query Store, force a plan, add an index, or change isolation without explicit authorization.
- A benchmark belongs in an identified test environment with representative data, bounded load,
  correctness checks, and a cleanup or rollback path.

## Output

Use this structure when enough evidence is available:

1. **Finding** — one-sentence diagnosis and confidence.
2. **Observed evidence** — bounded facts with time windows, plan/query IDs, and relevant metrics.
3. **Reasoning** — why the evidence supports the cause and what contradicts it.
4. **Recommendation** — smallest reversible change; distinguish code, index, statistics, Query
   Store, application, and operational actions.
5. **Validation** — before/after workload, parameters, correctness checks, and metrics.
6. **Risk and rollback** — regression modes, monitoring window, and exact reversal concept.
7. **Missing evidence** — unavailable capabilities or facts that reduce confidence.

If evidence is insufficient, return ranked hypotheses and the next bounded diagnostic request rather
than pretending to know the cause.

Answer in the user's language. The seven items above are the shape of the answer, not required
English headings.

## Validation metrics

This is the canonical set the other references point to. Define a baseline and a representative
parameter set before proposing an after-test, then compare:

- correctness of the result contract first — rows, duplicates, ordering, `NULL` behavior;
- duration distribution rather than a single average;
- CPU, logical reads, and writes;
- memory grant and spills;
- row counts and estimate accuracy;
- compilation and recompilation behavior;
- concurrency impact and waits;
- plan identity — whether the plan changed at all.

A lower estimated subtree cost is not proof of improvement. An improvement measured on one parameter
value is not an improvement to the workload.

## Permissions expectation

The diagnostic endpoint should operate with only the database permissions required for its exposed
views. SQL Server versions differ: Query Store and performance views commonly require `VIEW DATABASE
STATE`, while SQL Server 2022 and later can use the narrower `VIEW DATABASE PERFORMANCE STATE` for
some views. Object definitions require appropriately scoped metadata visibility or `VIEW DEFINITION`.
Do not assume `VIEW SERVER STATE` is available.
