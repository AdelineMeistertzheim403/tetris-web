import { PrismaClient } from "@prisma/client";

// Client Prisma singleton pour éviter les multiples pools de connexions.
const prisma = new PrismaClient();
export default prisma;

