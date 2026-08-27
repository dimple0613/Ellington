# API_REFERENCE.md — API Endpoints (planned)

All routes under `/api/*`. Every route (except `auth/login`, `auth/logout`) requires a
valid session + `requirePermission`. Parameterized SQL only.

## Auth
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/auth/login` | POST | public | email+password → session cookie |
| `/api/auth/logout` | POST | any signed-in | clears cookie |
| `/api/auth/forgot-password` | POST | public | one-time token → email link |
| `/api/auth/reset-password` | POST | public | validate token, re-hash |

## Portfolio
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/dashboard` | GET | super_admin/ops | KPIs: GDV, sold, collected, outstanding, overdue |
| `/api/projects` | GET | all | list + money bars |
| `/api/financials` | GET | super_admin/finance | consolidated |
| `/api/cashflow` | GET | super_admin/finance | forecast |

## Inventory
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/inventory` | GET | ops | unit board by project/floor |
| `/api/pricing` | GET | ops | pricing & availability |
| `/api/units/[id]` | PATCH | ops | change status (logged to audit) |

## Sales
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/leads` | GET/POST | ops | kanban stages |
| `/api/leads/[id]` | PATCH | ops | move stage |
| `/api/booking` | POST | ops | 5-step wizard (unit → buyer → schedule → docs → confirm) |
| `/api/buyers` | GET | ops/finance | buyer 360 |
| `/api/brokers` | GET | ops | |

## Finance
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/payments` | GET | finance/ops | receipts, cheque register |
| `/api/invoices` | GET | finance | |
| `/api/collections` | GET | finance | ageing buckets, dunning |
| `/api/escrow` | GET | finance | recon variance, catch-up queue |
| `/api/reports` | GET | super_admin | CSV export |

## System
| Route | Method | Access | Notes |
|---|---|---|---|
| `/api/users` | GET/POST/PATCH | super_admin | invite, roles |
| `/api/audit` | GET | super_admin | audit log |