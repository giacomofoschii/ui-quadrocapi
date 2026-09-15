FROM node:22-alpine

WORKDIR /app

# Installiamo le dipendenze base
COPY package.json package-lock.json* ./
RUN npm ci

# Copiamo il resto del codice
COPY . .

# Esponiamo la porta di default di Next.js
EXPOSE 3000

# Comando di avvio in dev mode
CMD ["npm", "run", "dev"]
