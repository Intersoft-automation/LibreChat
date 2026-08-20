# Execution-plan analysis

Use execution plans to explain measured behavior, not as a standalone scorecard.

## Evidence order

1. Confirm that the plan belongs to the affected statement and time window.
2. Compare actual and estimated rows where actual runtime data is legitimately available.
3. Identify operators responsible for material rows, reads, CPU, elapsed time, memory, or spills.
4. Inspect predicates, conversions, join keys, ordering, memory grants, parallelism, and warnings.
5. Relate the finding to indexes, statistics, constraints, and the calling parameter shape.

## Interpretation cautions

- A scan is reasonable when much of an object is needed or no selective access path exists.
- A seek can still read many rows through a residual predicate.
- Missing-index suggestions are optimizer hints, not complete designs. Check existing and overlapping
  indexes, write cost, key order, includes, filters, uniqueness, and workload coverage.
- A large estimate error is important when it changes join choice, memory grant, access path, or
  downstream work. Avoid ratios that divide by zero; report absolute values too.
- Hash and sort spills support a memory or cardinality problem but do not identify its root cause.
- Implicit conversion matters when it affects an access predicate, cardinality, or CPU; not every
  conversion is harmful.
- High estimated subtree cost is not elapsed time.
- Parallelism is not automatically a defect. Distinguish useful parallel work from skew, exchange
  pressure, and excessive per-execution overhead.

## Statistics and indexes

Evaluate statistics relevance, sampled quality, filtered coverage, data skew, ascending keys, and
correlation. Age alone does not prove statistics are stale.

For an index recommendation, state the targeted predicate or join, expected access path, likely
read reduction, write/storage tradeoff, overlap with current indexes, and how the change will be
tested. Prefer modifying or consolidating an existing index when that is demonstrably safer.

Actual plans require execution of the underlying statement. Never request one on production merely
for diagnosis. Prefer plans and runtime statistics already captured by Query Store or the plan cache.

Microsoft reference:

- https://learn.microsoft.com/sql/relational-databases/performance/display-an-actual-execution-plan
