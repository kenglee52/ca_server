/*
  Warnings:

  - You are about to drop the `loan_documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "loan_documents" DROP CONSTRAINT "loan_documents_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "loan_documents" DROP CONSTRAINT "loan_documents_uploadedById_fkey";

-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "documentLinks" TEXT;

-- DropTable
DROP TABLE "loan_documents";

-- DropEnum
DROP TYPE "DocumentType";
