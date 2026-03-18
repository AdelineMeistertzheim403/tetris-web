ALTER TABLE "UserAchievementStats"
ADD COLUMN "tetrobotProgression" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "tetrobotXpLedger" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "tetrobotAffinityLedger" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "lastTetrobotLevelUp" JSONB;
