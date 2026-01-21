FROM node:20-slim

RUN apt-get update \
  && apt-get install -y build-essential python3 netcat-traditional

WORKDIR /usr/src/bachelor-backend

COPY package*.json ./

RUN npm install 

ENV NODE_ENV=production

COPY . .

RUN npm run build

ENTRYPOINT [ "/usr/src/bachelor-backend/docker/entrypoint.sh" ]
CMD [ "npm", "run", "start" ]


