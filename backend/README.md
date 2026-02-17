# Backend Setup

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure env

Copy `.env.example` to `.env` and fill:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

## 3. Run migrations

Run SQL files in order:

1. `migrations/001_init.sql`
2. `migrations/002_seed.sql`

## 4. Start API

```bash
npm run dev
```

Health:

- `GET /health`

