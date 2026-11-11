# Monitoring / analysis plan

## Goal and source

Business question; property; authorised report/export; extraction date; report name; filters; time zone; dimensions; completeness limits.

## Metrics

| Metric | Definition / denominator | Source report | Scope | Comparison | Guardrail |
|---|---|---|---|---|---|
| Populate | Populate | Populate | Page/query/device/country/surface | Comparable periods | Populate |

CTR is clicks divided by impressions when both counts come from the same compatible report scope. Undefined denominators remain undefined, not zero by default.

## Diagnosis

Separate metric changes from technical events, demand, composition and inferred ranking effects. Preserve alternative explanations. Describe statistical or causal strength only as justified by the design.

## AI and specialised reports

Record the actual available report and dimensions. Do not presume old aggregate-only reporting or invent separate filters/API fields. Verify live guide and property behavior when material.

## Operations

Owner; observation cadence as a plan; thresholds grounded in baseline variability; response playbook; data retention and redaction. A proposed cadence is not a running scheduled job.
