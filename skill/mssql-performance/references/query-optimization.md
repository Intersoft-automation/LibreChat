# MSSQL query optimization

Use this reference after evidence identifies query shape or access path as a plausible cause. A
syntactic rewrite is not an optimization until it preserves results and improves the target workload.

## Preserve the result contract

Before comparing alternatives, define required rows, duplicates, ordering, `NULL` behavior, isolation
semantics, and parameter types. Test equivalence with representative edge cases. Rewrites between
`IN`, `EXISTS`, joins, aggregation, and window functions can change semantics even when examples look
the same.

## Predicates and conversions

- Prefer seekable range predicates for timestamps and other ordered values when they express the
  requirement. Use half-open ranges for time intervals.
- Compare data types on both sides of important predicates. Record the conversion direction and the
  plan warning before blaming an implicit conversion.
- A function on a search column, leading wildcard, arithmetic expression, or catch-all optional
  predicate is a candidate cause only when the plan and measured reads support it.
- Respect collation and case-sensitivity requirements. Do not remove a normalization function merely
  to make a predicate seekable if doing so changes matching behavior.

## Joins, subqueries, and aggregation

- Choose join type from required semantics. Do not change an outer join to an inner join solely for
  speed.
- Use `EXISTS` for an existence question and a join when columns from both sides are required. Avoid
  universal claims that one spelling is always faster; SQL Server can transform equivalent shapes.
- Investigate many-to-many expansion, missing join predicates, repeated correlated work, scalar UDFs,
  and row-by-row application calls. Quantify the amplification.
- Conditional aggregation or a window function may consolidate repeated work, but compare memory
  grant, spills, parallelism, and cardinality rather than assuming fewer statements is always better.

## Pagination and result bounds

- Always provide a deterministic order with a unique tie-breaker.
- Large `OFFSET/FETCH` values can require reading and sorting skipped rows. For sequential navigation,
  consider keyset pagination using the complete ordering tuple.
- Keyset pagination changes random-page navigation and cursor semantics; state this API trade-off.
- Project only required columns and bound interactive result sets, but do not remove columns required
  for correctness or stable pagination.

## Index decisions

Never propose an index from a predicate list alone. Inspect existing keys, included columns, filters,
usage, table size, write rate, and representative plans first.

For a candidate index:

1. Map equality, range, join, and ordering needs to key order; use included columns only for coverage.
2. Check overlap with current indexes and whether an existing index can be adjusted instead.
3. Estimate write, storage, build, logging, and maintenance cost.
4. Consider a filtered index only when its predicate is stable, selective, compatible with the query,
   and operationally maintainable.
5. Validate with the real parameter distribution and concurrency, not only one estimated plan.

Treat missing-index hints as hypotheses. They do not account fully for overlapping indexes, write
cost, or the whole workload.

## Validation

Compare a stable baseline across representative parameters, preferring Query Store distributions over
single executions, and explain every regression and trade-off the rewrite introduces. Use the
canonical metric set in [safety-and-output.md](safety-and-output.md).
