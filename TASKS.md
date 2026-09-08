# TASKS.md — Project Standardization Runbook

> Mirrors the "Full Project Audit" effort (issues #20–#34). Phase × items map to
> `docs/ARCHITECTURE.md` §7 sequencing. Update checkboxes as each phase lands.

## Phase 1 — Current-state audit (horizontal)
- [x] Map pages, API routes, screens, lib, config, docs (`docs/ARCHITECTURE.md`)
- [x] Confirm dependency reality (dead deps: ~~formik~~, ~~yup~~, ~~date-fns~~)
- [x] Confirm styling stack (inline styles + `lib/format.ts` tokens; no Tailwind/shadcn)
- [x] Confirm auth/RBAC wiring server-side (`withSession`/`withPerm`)

## Phase 2 — Standards inventory
- [x] Write `docs/ARCHITECTURE.md` (current state + standardized target + AUD-001…014)
- [x] File 15 AUD issues (#20–#34) with severity labels

## Phase 3 — AGENTS.md rulebook
- [x] Full development rulebook in `AGENTS.md` (stack, conventions, branching, commands, safety)

## Phase 4 — .opencode setup
- [x] `.opencode/agent/auditor.md` (standards auditor subagent)
- [x] `.opencode/command/audit.md` (`/audit` command)
- [ ] Restart opencode so the config loads (operator)

## Phase 5 — Folder structure (target)
- [x] Document target structure (`docs/ARCHITECTURE.md` §5) — no moves needed

## Phase 6 — Safe fixes
- [x] AUD-001 login error leak (#32) — generic 500, logs server-side
- [x] AUD-002 JWT secret fail-closed (#33) — `requireSecret()`
- [x] AUD-003 mail reset link leak (#20) — link omitted in production logs
- [x] AUD-003b admins validation (#34) — `withSession` + per-method `hasPerm`, validators
- [x] AUD-004 permissions dedupe (#21) — single source via `permission-map.ts`
- [x] AUD-008 dead deps (#25) — formik/yup/date-fns removed
- [x] AUD-010 Stub dedupe (#27) — shared `components/app/Stub.tsx`
- [x] AUD-011 `any` mappers (#28) — typed rows in Inventory/Payments/Sales/Users
- [x] AUD-012 cookie hardening (#29) — `Secure` + `__Host-session` over HTTPS
- [x] AUD-013 `.env.example` (#30) — generic seed creds + Neon pool/unpooled doc
- [x] AUD-014 `.gitignore` (#31) — `backups/`, `*.local`

## Phase 7 — Deferred / needs-approval fixes
- [ ] AUD-005 test framework (#23) — needs operator approval to add dev deps
- [ ] AUD-006 role → permission-map rewiring (#22) — not started
- [ ] AUD-007 fetch error states (#24) — deferred (visual change; see issue)
- [ ] AUD-009 API envelope (#26) — deferred (contract change; see issue)

## Phase 8 — Build & regression
- [x] `npm run lint` (tsc) green
- [x] `npm run build` green
- [ ] Round-trip retest: browser smoke across groups after fixes (operator or harness)

## Phase 9 — TASKS.md
- [x] This runbook

## Phase 10 — Final GitHub status summary
- [ ] Post audit status summary on the AUD tracker issues / board (operator approves board retry)