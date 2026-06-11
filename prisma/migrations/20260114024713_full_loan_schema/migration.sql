-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "pdfFileName" TEXT,
ADD COLUMN     "pdfFileUrl" TEXT,
ADD COLUMN     "pdfUploadedAt" TIMESTAMP(3);
