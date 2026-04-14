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
CLIENT_URL=http://localhost:3000
PORT=5000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with nodemon + ts-node |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:migrate` | Apply DB migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed initial data |

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
