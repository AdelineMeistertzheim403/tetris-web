-- CreateTable
CREATE TABLE "UserAchievementStats" (
    "userId" INTEGER NOT NULL,
    "loginDays" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAchievementStats_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserAchievementStats" ADD CONSTRAINT "UserAchievementStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
