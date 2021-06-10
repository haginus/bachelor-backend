FROM node:14.15.5

WORKDIR /usr/src/bachelor-backend

RUN apt-get -y update && apt-get -y install netcat

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install 

COPY . .

RUN npm run build

ENTRYPOINT [ "/usr/src/bachelor-backend/docker/entrypoint.sh" ]
CMD [ "npm", "run", "start" ]


