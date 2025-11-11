FROM node:20-slim

# 1️⃣ Installer OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 2️⃣ Dossier de travail
WORKDIR /app

# 3️⃣ Copier les dépendances
COPY package*.json ./
RUN npm ci

# 4️⃣ Copier le code + le .env
COPY . .

# 5️⃣ ✅ Définir une valeur temporaire de DATABASE_URL pour la génération Prisma
# (peu importe si elle n’existe pas, c’est juste pour éviter l’erreur)
ENV DATABASE_URL="postgresql://placeholder_user:placeholder_pass@localhost:5432/placeholder_db"

# 6️⃣ Générer le client Prisma
RUN npx prisma generate && npx tsc

ENV NODE_ENV=production
ENV PORT=8080

# 7️⃣ Exposer et lancer
EXPOSE 8080
CMD ["node", "dist/server.js"]
