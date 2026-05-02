FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
