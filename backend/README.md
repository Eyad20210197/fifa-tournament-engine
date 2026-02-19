# Backend Setup

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure env (Neon)

Copy `.env.example` to `.env` and fill:

- `DATABASE_URL` (from Neon dashboard, include `sslmode=require`)
- `JWT_SECRET`
- `FRONTEND_URL` and/or `ALLOWED_ORIGINS`

Neon connection string source:

1. Neon Console -> Org `org-dry-silence-09781812`
2. Open project `rough-firefly-07462192`
3. Dashboard -> Connection Details -> copy the pooled `DATABASE_URL`
4. Paste into `.env` as `DATABASE_URL=...`

## 3. Run migrations

Run SQL files in order:

1. `migrations/001_init.sql`
2. `migrations/002_seed.sql`
3. `migrations/003_live_state.sql`

## 4. Start API

```bash
npm run dev
```

Health:

- `GET /health`
