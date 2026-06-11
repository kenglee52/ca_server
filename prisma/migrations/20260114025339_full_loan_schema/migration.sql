/*
  Warnings:

  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email",
DROP COLUMN "fullName",
DROP COLUMN "phone";

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "changes" JSONB,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_performedAt_idx" ON "audit_logs"("performedAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
