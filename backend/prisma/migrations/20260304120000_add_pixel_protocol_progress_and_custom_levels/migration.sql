-- CreateTable
CREATE TABLE "PixelProtocolProgress" (
    "userId" INTEGER NOT NULL,
    "highestLevel" INTEGER NOT NULL DEFAULT 1,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelProtocolProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PixelProtocolCustomLevel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelProtocolCustomLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PixelProtocolCustomLevel_userId_levelId_key" ON "PixelProtocolCustomLevel"("userId", "levelId");

-- CreateIndex
CREATE INDEX "PixelProtocolCustomLevel_userId_updatedAt_idx" ON "PixelProtocolCustomLevel"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PixelProtocolProgress" ADD CONSTRAINT "PixelProtocolProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PixelProtocolCustomLevel" ADD CONSTRAINT "PixelProtocolCustomLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
