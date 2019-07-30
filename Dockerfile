FROM node:carbon
WORKDIR /opt/epg
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y wget curl zip vim nano
COPY . .
CMD [ "./start.sh" ] 
