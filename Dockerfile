FROM node:22

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium=147.0.7727.137-1~deb12u1 \
        chromium-common=147.0.7727.137-1~deb12u1 \
        chromium-sandbox=147.0.7727.137-1~deb12u1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "src/index.js"]