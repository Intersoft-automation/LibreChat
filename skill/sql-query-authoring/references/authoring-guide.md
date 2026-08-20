# T-SQL authoring guide

## Schema and contract

- Use schema-qualified object names and explicit projection lists.
- Match parameter types and lengths to the compared columns.
- Define expected uniqueness and row cardinality; do not rely on accidental ordering.
- Prefer a supported existing view or stored abstraction when it already owns the required semantics;
  inspect its definition and performance implications before composing another layer around it.
- Check partition boundaries and elimination only when the target is actually partitioned. SQL Server
  table partitioning is not the same concept as warehouse clustering.
- State behavior for no rows, duplicates, `NULL`, empty inputs, and boundary timestamps.
- Prefer half-open timestamp ranges: `column >= @from AND column < @to`.

## Query shape

- Keep search predicates SARGable where practical; avoid wrapping indexed columns in conversion or
  formatting functions.
- Parameterize values. When dynamic identifiers are truly required, validate them against known
  metadata and quote with `QUOTENAME`; keep values parameterized through `sp_executesql`.
- Use `EXISTS` for existence tests when it expresses the intended semantics. Treat `NOT IN` with
  nullable inputs carefully.
- Use deterministic `ORDER BY` for `TOP`, pagination, and user-visible sequencing.
- Do not add `DISTINCT` to hide an unexplained join multiplication.
- Avoid assuming a CTE is materialized. Use temporary structures only when their measured reuse,
  indexing, cardinality, or isolation benefit justifies them.
- Bound analytical and UI-facing result sets and define stable pagination.

## Stored procedures and writes

- Use `SET NOCOUNT ON` unless callers depend on row-count messages.
- Keep transactions as short as correctness permits. Use `SET XACT_ABORT ON` and structured error
  handling when a multi-statement atomic write requires dependable rollback.
- Make retry and idempotency behavior explicit for externally orchestrated calls.
- Avoid `MERGE` unless its concurrency and product-version behavior have been deliberately evaluated;
  separate statements are often easier to reason about and test.
- Return an explicit, stable result contract. Do not expose an early success result before later
  statements can fail.

## Validation

Include cases for typical input, empty results, duplicate keys, nullable values, boundary dates,
large cardinality, skewed parameters, concurrency where relevant, and permission failure. For writes,
include rollback/cleanup and prove that retries cannot duplicate effects.

## Delivery contract

Present a copyable query before commentary. List parameter declarations or caller expectations, then
explain non-obvious CTEs or phases. Clearly label schema assumptions. Performance notes must distinguish
facts learned from metadata or plans from hypotheses. Point out safe modification locations for common
changes such as date range, grouping level, filters, or page size.

## Worked fragment

Illustrative only. It shows the labeling discipline, not a schema you may assume exists.

```sql
DECLARE @from datetime2(3), @to datetime2(3);   -- half-open: @from included, @to excluded

SELECT   o.CustomerId,
         COUNT(*)          AS OrderCount,
         SUM(o.TotalNet)   AS TotalNet
FROM     dbo.[Order] AS o
WHERE    o.CreatedAt >= @from
  AND    o.CreatedAt <  @to
GROUP BY o.CustomerId
ORDER BY TotalNet DESC, o.CustomerId;           -- unique tie-breaker keeps paging stable
```

What the surrounding answer must then say:

- **Verified:** `Order.CreatedAt` is `datetime2(3)` and `TotalNet` is `decimal(19,4)`, both read from
  the object metadata — so `@from` and `@to` match the column type and no implicit conversion is
  introduced on the search column.
- **Assumed:** that cancelled orders should be included. The schema does not say; if `dbo.[Order]` has
  a status column the filter belongs in the `WHERE` clause and changes every number in the result.
- **Hypothesis, not measurement:** an index leading on `CreatedAt` would let this seek the range.
  Whether one exists and whether it is worth adding has not been checked here.

The distinction between those three labels is the deliverable. A reader who cannot tell which of your
statements were verified cannot safely use the query.
