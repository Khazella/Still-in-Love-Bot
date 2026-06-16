# Currently not used in production.
# Production runs directly from node:22 via docker-compose.

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "src/index.js"]
