# Create image based on the latest LTS (long term support) version
FROM node:dubnium

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --only=production

RUN apt update && apt install -y vim
# Bundle app source
COPY . .

CMD [ "node", "index.js" ]