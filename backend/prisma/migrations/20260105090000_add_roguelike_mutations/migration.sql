-- Add mutations to roguelike runs
ALTER TABLE "RoguelikeRun"
ADD COLUMN "mutations" JSONB NOT NULL DEFAULT '[]'::jsonb;
