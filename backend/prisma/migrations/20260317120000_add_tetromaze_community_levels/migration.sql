CREATE TABLE "TetromazePublishedLevel" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "levelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playCount" INTEGER NOT NULL DEFAULT 0,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TetromazePublishedLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TetromazePublishedLevelLike" (
  "id" SERIAL NOT NULL,
  "publishedLevelId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TetromazePublishedLevelLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TetromazePublishedLevel_userId_levelId_key"
ON "TetromazePublishedLevel"("userId", "levelId");

CREATE INDEX "TetromazePublishedLevel_updatedAt_idx"
ON "TetromazePublishedLevel"("updatedAt");

CREATE UNIQUE INDEX "TetromazePublishedLevelLike_publishedLevelId_userId_key"
ON "TetromazePublishedLevelLike"("publishedLevelId", "userId");

CREATE INDEX "TetromazePublishedLevelLike_userId_createdAt_idx"
ON "TetromazePublishedLevelLike"("userId", "createdAt");

ALTER TABLE "TetromazePublishedLevel"
ADD CONSTRAINT "TetromazePublishedLevel_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TetromazePublishedLevelLike"
ADD CONSTRAINT "TetromazePublishedLevelLike_publishedLevelId_fkey"
FOREIGN KEY ("publishedLevelId") REFERENCES "TetromazePublishedLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TetromazePublishedLevelLike"
ADD CONSTRAINT "TetromazePublishedLevelLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
