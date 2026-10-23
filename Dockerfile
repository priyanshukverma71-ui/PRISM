# Multi-stage Dockerfile for PRISM Platform

# Stage 1: Build API & Prisma
FROM node:20-alpine AS api
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/
RUN npm install
COPY apps/api ./apps/api
RUN npx prisma generate --schema=prisma/schema.postgresql.prisma
RUN npm run build --workspace=apps/api
EXPOSE 5000
CMD ["node", "apps/api/dist/server.js"]

# Stage 2: Build Web
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY apps/web ./apps/web
RUN npm run build --workspace=apps/web

# Stage 3: Serve Web with Nginx
FROM nginx:alpine AS web
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
