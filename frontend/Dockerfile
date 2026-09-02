# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_*-vars worden tijdens de build ingebakken (client-side), dus dit
# moet als build-arg meegegeven worden — zie docker-compose.yml / .env.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Alleen gezet door docker-compose.demo.yml — toont de demo-banner.
ARG NEXT_PUBLIC_DEMO=""
ENV NEXT_PUBLIC_DEMO=$NEXT_PUBLIC_DEMO

ARG NEXT_PUBLIC_PLATFORM_URL=http://localhost:3020
ENV NEXT_PUBLIC_PLATFORM_URL=$NEXT_PUBLIC_PLATFORM_URL
ARG NEXT_PUBLIC_FINANCE_URL=http://localhost:3000
ENV NEXT_PUBLIC_FINANCE_URL=$NEXT_PUBLIC_FINANCE_URL
ARG NEXT_PUBLIC_WENSEN_URL=http://localhost:3030
ENV NEXT_PUBLIC_WENSEN_URL=$NEXT_PUBLIC_WENSEN_URL
ARG NEXT_PUBLIC_BOOKMARKS_URL=http://localhost:3040
ENV NEXT_PUBLIC_BOOKMARKS_URL=$NEXT_PUBLIC_BOOKMARKS_URL

RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
