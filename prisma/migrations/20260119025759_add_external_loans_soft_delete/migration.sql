-- AlterTable
ALTER TABLE "external_loans" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
