CREATE TABLE "BrickfallSoloPublishedLevel" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "levelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playCount" INTEGER NOT NULL DEFAULT 0,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrickfallSoloPublishedLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrickfallSoloPublishedLevelLike" (
  "id" SERIAL NOT NULL,
  "publishedLevelId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrickfallSoloPublishedLevelLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrickfallSoloPublishedLevel_userId_levelId_key"
ON "BrickfallSoloPublishedLevel"("userId", "levelId");

CREATE INDEX "BrickfallSoloPublishedLevel_updatedAt_idx"
ON "BrickfallSoloPublishedLevel"("updatedAt");

CREATE UNIQUE INDEX "BrickfallSoloPublishedLevelLike_publishedLevelId_userId_key"
ON "BrickfallSoloPublishedLevelLike"("publishedLevelId", "userId");

CREATE INDEX "BrickfallSoloPublishedLevelLike_userId_createdAt_idx"
ON "BrickfallSoloPublishedLevelLike"("userId", "createdAt");

ALTER TABLE "BrickfallSoloPublishedLevel"
ADD CONSTRAINT "BrickfallSoloPublishedLevel_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BrickfallSoloPublishedLevelLike"
ADD CONSTRAINT "BrickfallSoloPublishedLevelLike_publishedLevelId_fkey"
FOREIGN KEY ("publishedLevelId") REFERENCES "BrickfallSoloPublishedLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BrickfallSoloPublishedLevelLike"
ADD CONSTRAINT "BrickfallSoloPublishedLevelLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
