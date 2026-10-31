FROM node:22.20.0-alpine3.22 AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY apps/web apps/web
COPY packages/contracts packages/contracts
RUN npm run build --workspace @haftsoo/contracts && npm run build --workspace @haftsoo/web

FROM node:22.20.0-alpine3.22 AS runtime
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000
WORKDIR /app
COPY --from=build /workspace/apps/web/.output ./
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
