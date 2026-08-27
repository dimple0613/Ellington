# WORKFLOW.md — How We Run

## One task at a time
1. CEO assigns exactly one task (from OneTask.md / GitHub issue).
2. Mark it `[~] in progress` in OneTask.md.
3. Work → review → operator approves.
4. Approved = issue closed, task marked `[x] in OneTask.md`.
5. Closed task triggers a status update email.

## Daily digest
- Sent at 10:00 and 22:00 IST to the CEO.
- Carries: today focus, in progress, done today, blocked, next.

## Rules
- Money & unit-status changes are auditable.
- Postgres is the source of truth; scoped by project/tenant.
- Every screen has loading / empty / error states.