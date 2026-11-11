# Handoff contract

A handoff must preserve the user’s goal and the truth of what happened, not just the most optimistic narrative.

Use `templates/handoff.json`. Include the exact target and mode, important scope exclusions, source IDs and access dates, relevant evidence IDs, completed actions, unperformed proposals, blockers, approvals and next verification step.

Do not attach credentials, cookies, access tokens, raw private visitor logs or unnecessary personal data. A summary of an approval should name the operation and scope without copying sensitive content.

When resuming, reread the most relevant modules and verify that current source requirements, deployments and approval scope still match. Do not assume that a previous proposed patch was deployed. If relevant evidence changed, reopen its conclusion rather than preserving a stale “passed” state.
