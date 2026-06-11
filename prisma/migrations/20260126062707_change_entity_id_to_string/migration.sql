/*
  Warnings:

  - The `entityId` column on the `audit_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "entityId",
ADD COLUMN     "entityId" INTEGER;

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
