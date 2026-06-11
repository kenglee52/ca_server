/*
  Warnings:

  - You are about to drop the column `pdfFileName` on the `loan_applications` table. All the data in the column will be lost.
  - You are about to drop the column `pdfFileUrl` on the `loan_applications` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUploadedAt` on the `loan_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loan_applications" DROP COLUMN "pdfFileName",
DROP COLUMN "pdfFileUrl",
DROP COLUMN "pdfUploadedAt";

-- AlterTable
ALTER TABLE "loan_documents" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;
