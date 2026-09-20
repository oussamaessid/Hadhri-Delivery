FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY backend ./backend
COPY features ./features
COPY lib ./lib
RUN mkdir -p /app/.data/backups && chown -R node:node /app/.data
USER node
ENV API_HOST=0.0.0.0 API_PORT=3001
EXPOSE 3001
CMD ["node", "backend/server.mjs"]
