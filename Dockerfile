# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install all deps (incl. dev) — schema is needed for the postinstall `prisma generate`.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Compile the server (-> dist/) and the seed (-> dist-seed/).
COPY . .
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production deps only; postinstall runs `prisma generate` (prisma CLI is a dependency).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Compiled output from the builder.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed

EXPOSE 5000

# Apply pending migrations, run the (idempotent) seed, then start the server.
CMD ["npm", "run", "start:deploy"]
