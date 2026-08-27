# DEPLOYMENT.md — Deployment

## Local dev
- Next.js (Pages Router) + PostgreSQL (Laragon) on `localhost:5432`, database `developer_inventory`.
- `DATABASE_URL` / `JWT_SECRET` / SMTP in `.env`.
- `npm run build` + `npm run start` for a production build.

## Production (planned)
- **Host:** Vercel (or VPS). Set `DATABASE_URL` to a managed Postgres (Neon/SUPABASE).
- **DB:** managed Postgres with RLS or app-level project scoping.
- **Secrets:** set `JWT_SECRET`, SMTP, and admin creds in the host; never commit `.env`.
- **HTTPS** everywhere; cookie `Secure`.

## Security checklist
- Rotate the seeded admin password.
- Rate-limit `auth/login`.
- Server-side auth/permission on every route; no secrets in responses.

## Daily digest
- A scheduled job (cron) sends the OneTask.md status digest at 10:00 & 22:00 IST.