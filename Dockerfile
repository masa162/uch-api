# 1. 依存関係のインストールステージ
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# 2. ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma Clientを生成
RUN npx prisma generate
RUN npm run build

# 3. 本番ステージ
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 必要なファイルだけをビルドステージからコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# 本番用の起動コマンドに変更
CMD ["npm", "start"]