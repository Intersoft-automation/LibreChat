# T-SQL review checklist

Apply this selectively. A review is not improved by reporting harmless patterns.

## Correctness

- Join cardinality and accidental row multiplication.
- Missing or incorrect join predicates; outer joins neutralized by `WHERE` predicates.
- `NULL` behavior in comparisons, aggregates, concatenation, `NOT IN`, and optional filters.
- `TOP`, pagination, window functions, or variable assignment without deterministic ordering.
- Boundary errors in dates and time zones; prefer explicit half-open intervals for timestamp ranges.
- Truncation, overflow, precision/scale loss, collation mismatch, and implicit type conversion.
- Duplicate handling hidden by `DISTINCT` or broad aggregation.
- Incorrect assumptions about CTE materialization, evaluation order, or scalar subquery cardinality.
- Error paths and transaction state, especially partial writes across multiple statements.

## Performance

- Non-SARGable predicates and functions or conversions on indexed search columns.
- Optional-parameter patterns that collapse selectivity and plan quality.
- Repeated correlated work, scalar UDF amplification, cursor/RBAR behavior, and avoidable rescans.
- Unbounded result sets, overly wide projections, inappropriate sorting, and unnecessary materialization.
- Index recommendations that ignore existing overlap, key order, include columns, filters, and write cost.
- Parameter sensitivity and compile behavior where the calling pattern makes them relevant.

## Concurrency and operability

- Transaction scope longer than necessary, inconsistent access order, and avoidable lock escalation.
- Unsafe retry behavior or non-idempotent operations behind automatic retries.
- Missing `XACT_ABORT` or `TRY/CATCH` where a multi-statement transaction requires dependable rollback.
- Dynamic SQL that loses parameterization, permissions, or plan reuse.
- Deployment-sensitive dependencies, cross-database references, temporary object assumptions, and
  incompatible SQL Server version or compatibility-level features.

## Security

- SQL injection through concatenated identifiers or values.
- Excessive execution context, ownership chaining assumptions, or access to objects beyond the task.
- Sensitive values exposed through results, errors, logs, comments, or diagnostic output.

## Finding severity

- **Critical:** plausible data loss, corruption, unauthorized access, or uncontrolled mutation.
- **High:** incorrect results, common deadlock/failure path, or severe workload amplification.
- **Medium:** meaningful defect under a narrower input or workload.
- **Low:** maintainability or resilience improvement with limited immediate impact.

Do not report style-only preferences unless the user requests a style review.

## Finding format

For each actionable finding, provide:

1. severity and category;
2. precise location;
3. observed problem and whether it is confirmed or schema/workload-dependent;
4. triggering input, concurrency pattern, or workload;
5. correctness, security, performance, or operational impact;
6. smallest concrete correction;
7. validation and any behavior or deployment risk.

Use before/after SQL only when the fragment is small enough to expose the difference. Do not claim a
performance gain numerically without measurements. Summarize the few highest-priority actions instead
of assigning subjective scores.

## Worked finding

Illustrative only. Never reuse its text or its claims as a finding of your own.

Submitted fragment:

```sql
SELECT c.CustomerId, c.Name
FROM dbo.Customer AS c
WHERE c.CustomerId NOT IN (SELECT o.CustomerId FROM dbo.[Order] AS o);
```

**High · correctness — line 3, the `NOT IN` predicate.**

`dbo.Order.CustomerId` is nullable, confirmed by inspecting the column rather than assumed. A single
`NULL` in the subquery makes the predicate `UNKNOWN` for every row, so the query silently returns no
rows at all. One unmatched import row is enough to trigger it. The impact is incorrect results with no
error, in a query whose apparent purpose is listing customers that have no orders.

Smallest correction:

```sql
WHERE NOT EXISTS (SELECT 1 FROM dbo.[Order] AS o WHERE o.CustomerId = c.CustomerId);
```

Validation: run both against a copy containing one order row with `CustomerId IS NULL`. The corrected
version returns the expected customers; the original returns none. Risk: none for callers that expect
the documented behavior — a caller depending on the empty result is depending on the defect.

Note the shape. The finding names the triggering input, separates the confirmed schema fact from
inference, gives one concrete correction, and stops. It does not grade the query, estimate a
percentage improvement, or list the unrelated style issues in the same fragment.
