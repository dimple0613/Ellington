# AGENTS.md — Agent Guidance

## Project
Developer Inventory — Next.js + PostgreSQL ERP console.
Reference UI: `Archive/UI systems design review/Ellington ERP.dc.html`.

## Conventions
- Use design tokens; shadcn/ui + Tailwind, Formik + Yup forms, toast feedback.
- Parameterized SQL only. No secrets committed.
- Server-side auth on all API routes.
- One task at a time; update OneTask.md status per task.

## Commands (once Next app exists)
- `npm run dev` / `npm run build` / `npm run lint`

## Tracking
- Track status in [OneTask.md](./OneTask.md); approvals close the GitHub issue.