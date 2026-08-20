# Diagnostic evidence tools

The authorized diagnostic capabilities are read-only and bounded. Their tool names carry a source
prefix and a deployment suffix, so match by the capability name inside the key rather than by an exact
string: a key ending in `search_database_objects` is the search capability regardless of prefix. If a
capability named here is absent from your tool set, treat it as unavailable evidence — do not
substitute a general SQL executor for it.

## Question to call

| Question | Call | Notes |
| --- | --- | --- |
| Which object does the user mean? | `search_database_objects` | `pattern` required; optional `object_kinds` (`table`, `view`, `procedure`, `function`) and `limit`. Several matches means ask, not guess. |
| What is this object and what does it touch? | `inspect_database_object` | `qualified_name` required. Returns definition, columns, dependencies, indexes, statistics metadata. A large definition arrives as an artifact ID. |
| Why is this procedure behaving badly? | `diagnose_procedure` | `qualified_name` required. Bounded overview with warnings, plan IDs, and artifact IDs. Usually the correct second call. |
| How did it behave over time? | `get_query_history` | Optional `qualified_name` and `limit`. Query Store, plus cached DMV history when available. |
| What is inside a specific plan? | `get_plan_detail` | `plan_id` required; `view` is one of `summary`, `operators`, `warnings`, `predicates`, `xml_chunk`; `cursor` and `page_size` page the result. |
| How do I read a large definition or plan? | `get_artifact_chunk` | `artifact_id` required; `cursor` and `max_bytes` page it. |

## Sequencing

- Resolve the name before any call that takes `qualified_name`. Passing a guessed name produces a
  confident answer about the wrong object.
- For a procedure complaint, `diagnose_procedure` before `inspect_database_object`: the overview
  already carries the plan and artifact IDs that decide what to inspect next.
- `get_query_history` before choosing a plan to open. Opening the currently cached plan first biases
  the whole diagnosis toward whatever ran most recently.
- Within `get_plan_detail`, `summary` and `warnings` are cheap and often sufficient. Reach `operators`
  and `predicates` when you need to attribute cost or explain a conversion. `xml_chunk` is the last
  resort for a detail no normalized view exposes; say why you needed it.
- Compare like with like: when contrasting two plans, request the same `view` for both.

## Paging and artifacts

- Every tool result stays in the conversation and is re-sent on each later step, so a wide result is
  paid for repeatedly. Ask for the smallest slice that can answer the question and widen only when it
  demonstrably cannot.
- Cursors are opaque. Page only while each page can still change the conclusion, and stop as soon as
  it cannot.
- Artifact IDs are scoped to the caller and the target, expire, and do not survive a service restart.
  A failed artifact read means re-run the call that produced it, never reconstruct the content from
  memory.
- Never widen `page_size` or `max_bytes` to avoid paging, and never ask for the complete plan XML.

## Partial results are evidence

Missing Query Store data or a missing permission produces a partial result with a warning, not an
error. That warning is itself a finding:

- Name the specific capability that was unavailable and what it prevents concluding.
- Continue with the remaining evidence and lower your stated confidence accordingly.
- Put it in the **Missing evidence** section of the answer.
- Do not fill the gap with a typical value, a remembered case, or a plausible number.

## Worked diagnosis

The values below are illustrative. Never reuse them as observations.

> **User:** `dbo.usp_OrderSummary` used to run about 2 s, since Monday it takes about 30 s.

1. `search_database_objects(pattern: "usp_OrderSummary")` → one match, `dbo.usp_OrderSummary`. Two
   matches would mean asking which one, not picking the likelier.
2. `diagnose_procedure(qualified_name: "dbo.usp_OrderSummary")` → overview, plan IDs `P_A` and `P_B`,
   warning that Query Store capture mode is `AUTO`, so infrequent statements may be missing.
3. `get_query_history(qualified_name: "dbo.usp_OrderSummary", limit: 20)` → `P_A`: 812 executions,
   avg 2.1 s, ~41k logical reads, active until Monday 09:00. `P_B`: 640 executions, avg 28.7 s,
   ~2.9M logical reads, active since Monday 09:00. Now the regression is measured, not reported.
4. `get_plan_detail(plan_id: "P_B", view: "warnings")` → hash spill to tempdb.
   `get_plan_detail(plan_id: "P_B", view: "predicates")` → seek on `OrderDate`, residual predicate on
   `CustomerId` with an implicit conversion from `nvarchar` to `varchar`.
   `get_plan_detail(plan_id: "P_A", view: "predicates")` → same seek, no residual conversion.
5. Stop. The two plans differ in one attributable way; `xml_chunk` would add nothing.

The answer then states: the regression is a plan change on Monday 09:00 (observed), most likely caused
by the parameter type mismatch on `CustomerId` forcing a residual predicate and a bad row estimate
(high confidence, supported by the estimate gap and the spill); alternatives are a data volume change
and a statistics change on the same date (both contradicted by the unchanged `P_A` estimates);
recommendation is to align the parameter type in the caller, the smallest reversible change; validated
by comparing the same metrics for the next 24 h against the `P_A` baseline; risk is a new plan on
recompilation, rolled back by reverting the caller; missing evidence is the statements dropped by the
`AUTO` capture policy.

Note what the answer does not do: it does not recommend an index, force `P_A`, or update statistics —
none of those was demonstrated as the cause.
