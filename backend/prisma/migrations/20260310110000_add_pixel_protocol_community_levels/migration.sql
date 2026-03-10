-- CreateTable
CREATE TABLE "PixelProtocolPublishedLevel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "world" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelProtocolPublishedLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PixelProtocolPublishedLevelLike" (
    "id" SERIAL NOT NULL,
    "publishedLevelId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelProtocolPublishedLevelLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PixelProtocolPublishedLevel_userId_levelId_key" ON "PixelProtocolPublishedLevel"("userId", "levelId");

-- CreateIndex
CREATE INDEX "PixelProtocolPublishedLevel_updatedAt_idx" ON "PixelProtocolPublishedLevel"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PixelProtocolPublishedLevelLike_publishedLevelId_userId_key" ON "PixelProtocolPublishedLevelLike"("publishedLevelId", "userId");

-- CreateIndex
CREATE INDEX "PixelProtocolPublishedLevelLike_userId_createdAt_idx" ON "PixelProtocolPublishedLevelLike"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PixelProtocolPublishedLevel" ADD CONSTRAINT "PixelProtocolPublishedLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PixelProtocolPublishedLevelLike" ADD CONSTRAINT "PixelProtocolPublishedLevelLike_publishedLevelId_fkey" FOREIGN KEY ("publishedLevelId") REFERENCES "PixelProtocolPublishedLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PixelProtocolPublishedLevelLike" ADD CONSTRAINT "PixelProtocolPublishedLevelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
