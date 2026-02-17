-- CreateTable
CREATE TABLE "BrickfallSoloProgress" (
    "userId" INTEGER NOT NULL,
    "highestLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrickfallSoloProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BrickfallSoloCustomLevel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrickfallSoloCustomLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrickfallSoloCustomLevel_userId_levelId_key" ON "BrickfallSoloCustomLevel"("userId", "levelId");

-- CreateIndex
CREATE INDEX "BrickfallSoloCustomLevel_userId_updatedAt_idx" ON "BrickfallSoloCustomLevel"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "BrickfallSoloProgress" ADD CONSTRAINT "BrickfallSoloProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrickfallSoloCustomLevel" ADD CONSTRAINT "BrickfallSoloCustomLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
