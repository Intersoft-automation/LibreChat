# Diagnostic workflow

Use the smallest evidence sequence that can distinguish competing causes. Stop collecting data when
the cause is supported well enough to recommend a measurable next step.

This file is the reasoning sequence; [evidence-tools.md](evidence-tools.md) is which call to make at
each step and how to page its result.

## 1. Frame the incident

Identify:

- database and schema-qualified object or a stable query identifier;
- slow, variable, newly regressed, blocking, CPU-heavy, read-heavy, or timeout behavior;
- observed and expected duration, approximate start of regression, and affected parameter shape;
- whether the report describes one execution or a workload distribution.

Do not silently choose among similarly named objects or databases.

Choose the identifier path before collecting evidence:

- schema-qualified procedure/view → object diagnosis;
- pasted SQL → `find_query` by exact ID/hash or stable text anchors, then query-specific history;
- numbered Delphi report → `diagnose_report_regression`;
- no stable identifier → ask for the smallest missing identifier instead of browsing global history.

Translate relative time language into tool windows. In particular, "last week" means
`recent_hours: 168` against `baseline_days: 30`; do not silently fall back to a 24-hour window.

## 2. Establish object context

Collect the definition, object type, dependencies, relevant column types, constraints, indexes, and
statistics metadata. Limit inspection to objects referenced by the affected statements. Note dynamic
SQL and cross-database references because static dependency discovery can be incomplete.

## 3. Establish historical behavior

Use Query Store when available. Compare a recent affected window with a representative baseline.
Prefer distributions or interval-level data over a lifetime average. Capture:

- execution count;
- duration, CPU, logical reads, writes, and rows when available;
- number of plans and when each plan was active;
- wait categories and material changes between windows;
- Query Store capture state and any gaps that weaken the evidence.

## 4. Inspect representative plans

Start with normalized plan summaries and warnings. Choose plans that represent the baseline, the
regressed interval, and materially different parameter or cardinality shapes. Request operator and
predicate pages before XML fragments.

Relate every plan finding to measured workload impact. A scan, hash join, or high estimated cost is
not a defect by itself.

## 5. Form and rank hypotheses

Typical hypotheses include:

- plan regression or parameter sensitivity;
- cardinality error caused by stale, missing, correlated, or filtered statistics;
- non-SARGable or implicitly converted predicate;
- missing or poorly shaped index, excessive lookup amplification, or overlapping indexes;
- memory-grant underestimation and spill;
- blocking or a wait-bound workload rather than query-shape inefficiency;
- changed data volume, skew, compatibility level, configuration, or application call pattern.

For each leading hypothesis, record supporting evidence, contradicting evidence, and the next bounded
observation that could disprove it.

An unchanged plan does not rule out a SQL performance cause. If the same plan has materially
different reads, CPU, or duration between windows, rank parameter/data sensitivity ahead of a plan
regression and inspect predicates and candidate-row amplification.

## 6. Recommend and validate

Prefer the smallest reversible intervention. Distinguish:

- query or procedure code change;
- schema or index change;
- statistics maintenance;
- Query Store plan forcing or hint;
- application parameterization or batching change;
- operational response to blocking or resource pressure.

Every recommendation needs a before/after test defined before the change. Use the canonical metric set
in [safety-and-output.md](safety-and-output.md) — correctness first, then the runtime metrics — rather
than restating a partial list here.
