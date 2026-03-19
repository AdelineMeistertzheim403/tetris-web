ALTER TABLE "UserAchievementStats"
ADD COLUMN "statsSnapshot" JSONB NOT NULL DEFAULT '{}';

UPDATE "UserAchievementStats"
SET "statsSnapshot" = jsonb_strip_nulls(
  COALESCE("statsSnapshot", '{}'::jsonb) ||
  jsonb_build_object(
    'loginDays', COALESCE("loginDays", '[]'::jsonb),
    'tetrobotProgression', COALESCE("tetrobotProgression", '{}'::jsonb),
    'tetrobotXpLedger', COALESCE("tetrobotXpLedger", '{}'::jsonb),
    'tetrobotAffinityLedger', COALESCE("tetrobotAffinityLedger", '{}'::jsonb),
    'playerLongTermMemory', COALESCE("playerLongTermMemory", '{}'::jsonb),
    'tetrobotMemories', COALESCE("tetrobotMemories", '{}'::jsonb),
    'lastTetrobotLevelUp', COALESCE("lastTetrobotLevelUp", 'null'::jsonb),
    'activeTetrobotChallenge', COALESCE("activeTetrobotChallenge", 'null'::jsonb)
  )
);
