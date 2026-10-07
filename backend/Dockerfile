FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# Runtime starts with node directly; keep the package manager out of production.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
COPY backend ./backend
COPY features ./features
COPY lib ./lib
RUN mkdir -p /app/.data/backups && chown -R node:node /app/.data
USER node
ENV API_HOST=0.0.0.0 API_PORT=3001
EXPOSE 3001
CMD ["node", "backend/server.mjs"]
