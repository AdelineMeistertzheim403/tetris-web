-- CreateTable
CREATE TABLE "TetromazeCustomLevel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "levelId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TetromazeCustomLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TetromazeCustomLevel_userId_levelId_key" ON "TetromazeCustomLevel"("userId", "levelId");

-- CreateIndex
CREATE INDEX "TetromazeCustomLevel_userId_updatedAt_idx" ON "TetromazeCustomLevel"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "TetromazeCustomLevel" ADD CONSTRAINT "TetromazeCustomLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
