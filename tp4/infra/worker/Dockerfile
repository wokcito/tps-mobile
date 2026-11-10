FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY *.js *.cjs ./
USER node
CMD ["node", "index.js"]
