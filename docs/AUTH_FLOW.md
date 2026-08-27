# AUTH_FLOW.md — Authentication Flows

## Current State
**Designed (not yet implemented).** Multi-role console auth with signed, httpOnly
session cookies and server-side authorization on every API route.

## Flow
1. User signs in with email + password on `/login`.
2. `POST /api/auth/login` looks up `users` by lowercase email, verifies the scrypt hash.
3. On success a **session cookie** is set: HMAC-SHA256-signed payload `{ userId, email, role, projectScope, exp }` (signed with `JWT_SECRET`, 24h).
4. Every API route calls `withSession`, which verifies signature + expiry and attaches `req.session`.
5. Missing/invalid/expired → `401`; pages redirect to `/login`.

## Multiple Roles
See [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md). Authorization is always
server-side (`requirePermission`), and the sidebar hides screens the user cannot access.

## Scope (multi-project / tenant)
- A `projectScope` on the session limits data to the signed-in user's permitted project(s).
- Super admin has a null scope (sees everything) — the same pattern the valet ref uses for tenants.

## Security notes
- HTTPS required in production; mark the cookie `Secure`.
- Rate-limit `auth/login` (throttling added as part of hardening).
- scrypt hashing + `timingSafeEqual` for passwords; never store plaintext.

## Forgot / Invite (planned)
- Invite-by-email uses a one-time token link (mirroring the reset flow in the reference).