FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts --no-fund --no-audit 2>&1 | grep -v "^npm warn\|^npm notice" || true

COPY src/ ./src/

RUN mkdir -p uploads results data

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
