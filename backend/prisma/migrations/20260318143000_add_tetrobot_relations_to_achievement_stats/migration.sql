ALTER TABLE "UserAchievementStats"
ADD COLUMN "tetrobotProgression" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "tetrobotXpLedger" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "tetrobotAffinityLedger" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "playerLongTermMemory" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "tetrobotMemories" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "lastTetrobotLevelUp" JSONB,
ADD COLUMN "activeTetrobotChallenge" JSONB;
