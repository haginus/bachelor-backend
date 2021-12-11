FROM node:14-stretch

# Install Microsoft Fonts and netcat
RUN sh -c 'echo "deb http://ftp.de.debian.org/debian stretch contrib" >> /etc/apt/sources.list' \ 
    && apt-get update \
    && apt-get install -y ttf-mscorefonts-installer netcat nano

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /usr/src/bachelor-backend

COPY package*.json ./

RUN npm install 

COPY . .

RUN npm run build

ENTRYPOINT [ "/usr/src/bachelor-backend/docker/entrypoint.sh" ]
CMD [ "npm", "run", "start" ]


