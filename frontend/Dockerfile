FROM node:20-slim

WORKDIR /app

# Copier les fichiers nécessaires à l'installation
COPY package*.json ./

# ⬇️ Forcer l'installation de TOUTES les dépendances, y compris dev
ENV NODE_ENV=development
RUN npm install

# Copier le reste du code
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
