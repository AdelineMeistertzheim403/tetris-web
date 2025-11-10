# Étape 1 : Build du front
FROM node:20-slim AS build
WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./

# Installe toutes les dépendances (y compris dev)
RUN npm install

# Copie le reste du code
COPY . .

# Build Vite (avec TypeScript)
RUN npx tsc -b && npm run build

# Étape 2 : Serveur de production ultra léger
FROM node:20-slim
WORKDIR /app

# Installe un petit serveur statique
RUN npm install -g serve

# Copie les fichiers construits depuis l'étape précédente
COPY --from=build /app/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
