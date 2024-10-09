
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json frontend/
COPY backend/package*.json backend/

RUN npm run install-all

COPY . .

EXPOSE 3000
EXPOSE 5000

CMD ["npm", "start"]