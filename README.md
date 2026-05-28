# FTPI Backend

REST API for the Federation of Tax Practitioners India platform.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM (PostgreSQL)
- JWT auth (bcryptjs, cookie-parser)
- Razorpay for payments
- Multer for uploads, PDFKit for certificates

## Setup

```bash
npm install
cp .env.example .env   # fill in values
npm run prisma:generate
npm run prisma:migrate
npm run seed           # optional
npm run dev
```

Server runs on the port defined in `.env` (default `5000`).

## Environment variables

```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
FRONTEND_URL=http://localhost:3000
# Optional: extra allowed CORS origins (comma-separated). FRONTEND_URL is also allowed.
# localhost:3000 and https://ftpi.in / https://www.ftpi.in are allowed by default.
CORS_ORIGINS=
PORT=5000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with nodemon + ts-node |
| `npm run build` | Compile server to `dist/` and seed to `dist-seed/` |
| `npm start` | Run compiled server |
| `npm run start:deploy` | Apply migrations, seed, then start (used in production) |
| `npm run prisma:migrate` | Create/apply migrations (dev only — interactive) |
| `npm run migrate:deploy` | Apply pending migrations (production, non-interactive) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed via ts-node (local) |
| `npm run seed:prod` | Seed from compiled output (no ts-node) |

`prisma generate` runs automatically via the `postinstall` hook on every install.

## Deployment (Dokploy / Docker)

A multi-stage `Dockerfile` is included. On container start it runs
`prisma migrate deploy` → `seed:prod` → server (`npm run start:deploy`).
The seed is idempotent, so restarts/redeploys won't create duplicate data.

In Dokploy:

1. Create an Application pointing at the repo, build type **Dockerfile**, with the
   build context / base directory set to `backend`.
2. Set the environment variables listed above (at minimum `DATABASE_URL`,
   `JWT_SECRET`, `RAZORPAY_*`, `FRONTEND_URL`).
3. Mount a persistent volume at `/app/uploads` so user uploads and generated
   certificates survive redeploys.

## Layout

```
src/
  routes/        API route handlers
  middleware/    auth, validation, upload
  lib/           razorpay, pdf helpers
  types/         shared TS types
prisma/
  schema.prisma  data model
  migrations/
  seed.ts
uploads/         user-uploaded files
```
