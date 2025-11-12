FROM node:22-alpine AS builder
WORKDIR /app/node-server
COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app/node-server
COPY --from=builder /app/node-server/dist ./dist
COPY --from=builder /app/node-server/package*.json ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", "dist/server.js"]