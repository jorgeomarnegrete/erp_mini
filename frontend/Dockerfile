FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expone el puerto por defecto de Vite
EXPOSE 5173

# Lanza la preview o el modo dev. En pro, usaríamos `npm run build` y Nginx.
CMD ["npm", "run", "dev", "--", "--host"]
