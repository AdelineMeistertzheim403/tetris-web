CREATE TABLE "TetromazeProgress" (
  "userId" INTEGER NOT NULL,
  "highestLevel" INTEGER NOT NULL DEFAULT 1,
  "currentLevel" INTEGER NOT NULL DEFAULT 1,
  "levelScores" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TetromazeProgress_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TetromazeProgress"
ADD CONSTRAINT "TetromazeProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
