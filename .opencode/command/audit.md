---
description: Audits the project against docs/ARCHITECTURE.md standards and reports findings with an AUD issue summary.
agent: auditor
---

Run a standardization audit of the Ellington ERP project.

1. Read `docs/ARCHITECTURE.md` and `AGENTS.md` to load the current standards.
2. Check the $ARGUMENTS scope (default: the whole repo) against those standards.
3. Compare findings with open issues in the AUD tracker (issues #20–#34).
4. Open/update the matching AUD issue for anything new.

Report: what passed, what failed, and a one-line status per AUD issue.