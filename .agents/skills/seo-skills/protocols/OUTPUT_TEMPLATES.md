# Output contracts

Choose the smallest complete output that answers the user’s actual request. These formats are package design, not Google requirements.

## Audit / diagnosis

Scope and mode → main conclusion → observed evidence → mechanism and alternative hypotheses → prioritised action plan → acceptance tests → unknowns. Use `templates/audit-report.md`. Issue records should use `templates/issue.schema.json` where machine exchange is useful.

## Patch proposal

Target and current state → proposed minimal diff → why it addresses the observed issue → affected cases → local tests run → live tests still needed → approval requirement → rollback. Do not say “fixed” when only a patch was prepared.

## Implemented change

Authority and exact target → actual changes → actual command/tool results → live verification evidence → remaining risks and rollback. Separate the state of the deployment from its observed Search outcome.

## Structured data

Feature and current guide → factual inputs → property-to-evidence mapping → markup → syntax checks actually run → official feature checks actually run → remaining content/eligibility checks. Do not fill missing required facts by invention.

## Content brief

Audience task → unique value → reliable inputs → outline → examples/media → internal links → factual review owner → publication acceptance → measurement. Use `templates/content-brief.md`.

## Measurement or experiment

Report provenance → comparable windows → exact metric definitions → segmented observations → inference strength → hypotheses or results → next action. A plan is not a completed experiment.

## Teaching

Mechanism → small labeled fictional example → counterexample/common error → what evidence would resolve the question → compact checkpoint. Preserve official-versus-illustrative distinctions.

## Handoff

Use `templates/handoff.json`. Keep `completed`, `proposed`, `blocked` and `not_assessed` distinct. Include source access dates and exact verification status; do not persist secrets.

## Severity vocabulary

P0: confirmed broad accidental access/indexing outage or urgent exposure needing immediate triage. P1: material verified defect affecting important pages or outcomes. P2: scoped improvement or lower-impact defect. P3: optional enhancement or weakly evidenced opportunity. Severity does not replace confidence. These labels are prioritisation heuristics, not official Google scores.
