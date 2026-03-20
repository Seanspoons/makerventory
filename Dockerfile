FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx prisma generate

ENV NODE_ENV=development
EXPOSE 3000

CMD ["sh", "./scripts/docker-entrypoint.sh"]
