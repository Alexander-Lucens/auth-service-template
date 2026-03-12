FROM node:22.14.0-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY package-lock.json ./
COPY prisma ./prisma/

RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22.14.0-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /usr/src/app/doc ./doc

ENV PORT=4000
EXPOSE ${PORT}

CMD ["node", "dist/src/main.js"]
