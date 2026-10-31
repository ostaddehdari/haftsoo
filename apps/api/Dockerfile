FROM node:22.20.0-alpine3.22 AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --no-audit --no-fund
COPY apps/api apps/api
COPY packages/contracts packages/contracts
RUN npm run build --workspace @haftsoo/contracts && npm run build --workspace @haftsoo/api

FROM node:22.20.0-alpine3.22 AS runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
