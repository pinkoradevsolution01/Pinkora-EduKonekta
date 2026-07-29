FROM node:22-alpine
WORKDIR /workspace
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "cd apps/web && npm run dev"]
