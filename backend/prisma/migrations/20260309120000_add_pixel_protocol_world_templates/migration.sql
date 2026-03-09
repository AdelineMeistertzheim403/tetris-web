-- CreateTable
CREATE TABLE "PixelProtocolWorldTemplate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PixelProtocolWorldTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PixelProtocolWorldTemplate_userId_templateId_key" ON "PixelProtocolWorldTemplate"("userId", "templateId");

-- CreateIndex
CREATE INDEX "PixelProtocolWorldTemplate_userId_updatedAt_idx" ON "PixelProtocolWorldTemplate"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PixelProtocolWorldTemplate" ADD CONSTRAINT "PixelProtocolWorldTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
