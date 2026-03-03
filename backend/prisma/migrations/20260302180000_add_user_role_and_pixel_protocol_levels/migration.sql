-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "PixelProtocolLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelProtocolLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PixelProtocolLevel_world_sortOrder_idx" ON "PixelProtocolLevel"("world", "sortOrder");

-- CreateIndex
CREATE INDEX "PixelProtocolLevel_active_idx" ON "PixelProtocolLevel"("active");
