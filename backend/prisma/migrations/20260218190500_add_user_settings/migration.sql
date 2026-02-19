-- Persisted UI/game settings per authenticated user
CREATE TABLE "UserSettings" (
  "userId" INTEGER NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
