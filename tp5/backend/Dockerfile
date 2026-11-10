FROM node:22-alpine
WORKDIR /service
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
USER node
EXPOSE 3000 9000
CMD ["node", "src/server.js"]
