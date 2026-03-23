ALTER TABLE "PixelInvasionProgress"
  ADD COLUMN IF NOT EXISTS "pausedRun" JSONB;
