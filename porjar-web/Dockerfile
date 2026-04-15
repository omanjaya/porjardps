# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# Run stage
FROM node:22-alpine

RUN addgroup -S porjar && adduser -S -G porjar porjar

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R porjar:porjar /app

ENV NODE_ENV=production
ENV PORT=4200
ENV HOSTNAME=0.0.0.0

USER porjar

EXPOSE 4200

CMD ["node", "server.js"]
