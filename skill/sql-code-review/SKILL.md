---
name: sql-code-review
description: Use when the user asks to review, audit, or find problems in existing Microsoft SQL Server T-SQL — a procedure, view, function, trigger, or a pasted query — including "is this correct", "is this safe", and "what would you improve here". When the user instead reports observed slowness, a regression, or blocking, use mssql-performance; when the user wants new T-SQL written, use sql-query-authoring.
user-invocable: true
disable-model-invocation: false
always-apply: false
version: "0.3.0"
compatibility: LibreChat SQL Programmer agent; schema inspection tools are optional
---

# SQL Code Review

Review the submitted T-SQL without executing it. A review is judged by the defects it finds and the
noise it leaves out, never by its length.

Read [references/review-checklist.md](references/review-checklist.md) with the `read_file` tool and
apply only the checks the submitted code can actually violate. It also contains the severity
definitions, the per-finding format, and a worked example.

## Resolve, do not hedge

Schema uncertainty is usually resolvable. Before writing that something "depends on the schema",
inspect the relevant object with an authorized inspection capability and check the real types,
nullability, keys, relationships, and existing indexes. Reserve schema-dependent wording for facts the
available tools genuinely cannot establish, and say which fact is missing.

## Review standard

- Prioritize defects that change results, corrupt data, leak data, deadlock, or amplify the workload.
- Separate confirmed defects from schema- or workload-dependent concerns and from optional
  improvements. Never present the third group as if it were the first.
- Explain the input, parameter shape, or concurrency pattern that triggers each finding. A defect
  nobody can trigger is not a finding.
- Recommend the smallest local correction, and state the behavior change or migration risk it carries.
- Do not claim an index is missing without inspecting the existing indexes and the calling workload.
- Preserve intentional semantics. Do not rewrite working code to make it look different.
- Do not assert a performance gain you have not measured, and do not assign numeric quality scores.

## Output

1. One-line verdict: the most serious thing found, or that nothing actionable was found.
2. Findings ordered by severity, each in the format from the checklist.
3. The few highest-priority actions.
4. Assumptions you could not verify, and what would verify them.

Answer in the user's language, and keep the SQL identifiers unchanged. If the code is sound, say so
plainly rather than manufacturing findings to fill the report.
