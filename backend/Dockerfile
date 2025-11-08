FROM node:20-slim

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances dans l'image Linux (pas sur ton PC)
RUN npm ci

# Copier le reste du code
COPY . .

# Exposer le port de l’API
EXPOSE 8080

# Lancer en mode dev
CMD ["npm", "run", "dev"]
