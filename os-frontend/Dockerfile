FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Sincronizado estritamente com o barramento do vite.config.js local
EXPOSE 5600

# Força o Vite a escutar conexões externas na porta 5600 casada com o compose
CMD ["npm", "run", "dev", "--", "--port", "5600", "--host"]