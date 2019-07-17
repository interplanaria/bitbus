FROM node:alpine

RUN apk add --no-cache git

WORKDIR /bitbus
COPY . .

RUN npm install -g .

VOLUME /data
WORKDIR /data

EXPOSE 3007

ENTRYPOINT ["bitbus"]
CMD ["start"]
