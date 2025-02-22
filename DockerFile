FROM node:22.0.0

WORKDIR /app

ARG GIT_TAG=latest

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]

LABEL git.tag=${GIT_TAG}