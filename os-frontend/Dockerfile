FROM node:18-alpine

WORKDIR /app

# Copia tudo primeiro (inclusive a node_modules ruim, se vier do Git)
COPY . .

# Comando Sênior: Destrói qualquer node_modules ou dist do Windows que o COPY trouxe
RUN rm -rf node_modules dist

# Agora sim, instala tudo do zero e limpo para o Linux Alpine
RUN npm install --include=dev

EXPOSE 5600

CMD ["npm", "run", "dev", "--", "--port", "5600", "--host"]