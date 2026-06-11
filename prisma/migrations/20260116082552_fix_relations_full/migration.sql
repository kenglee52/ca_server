/*
  Warnings:

  - You are about to drop the column `comments` on the `assessments` table. All the data in the column will be lost.
  - Added the required column `endingNetIncome` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalInstallment` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalNetIncome` to the `assessments` table without a default value. This is not possible if the table is not empty.
  - Made the column `ltvThreshold` on table `assessments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `householdExpense` on table `borrowers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processingFeesPercent` on table `loan_applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `collateralFeesPercent` on table `loan_applications` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('NEW', 'EXISTING');

-- CreateEnum
CREATE TYPE "IncomeEvidenceType" AS ENUM ('BANK_STATEMENT', 'PAY_SLIP', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CIB_REPORT', 'BANK_STATEMENT', 'ID_CARD', 'CONTRACT', 'OTHER');

-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "comments",
ADD COLUMN     "ceoComments" TEXT,
ADD COLUMN     "cogsSalesRatio" DECIMAL(5,2),
ADD COLUMN     "currInstallToFina" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dcoComments" TEXT,
ADD COLUMN     "endingNetIncome" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "exisInstallToFina" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gpSalesRatio" DECIMAL(5,2),
ADD COLUMN     "npSalesRatio" DECIMAL(5,2),
ADD COLUMN     "operExpSalesRatio" DECIMAL(5,2),
ADD COLUMN     "payInstallToOther" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "preparerComments" TEXT,
ADD COLUMN     "totalInstallment" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "totalNetIncome" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "verifierComments" TEXT,
ALTER COLUMN "ltvThreshold" SET NOT NULL,
ALTER COLUMN "ltvThreshold" SET DEFAULT 0.00;

-- AlterTable
ALTER TABLE "borrowers" ADD COLUMN     "businessDistrict" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessProvince" TEXT,
ADD COLUMN     "businessRegistrationNumber" TEXT,
ADD COLUMN     "businessVillage" TEXT,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "monthlySalary" SET DEFAULT 0,
ALTER COLUMN "householdExpense" SET NOT NULL,
ALTER COLUMN "householdExpense" SET DEFAULT 0,
ALTER COLUMN "netIncome" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "external_loans" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "collateralFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "earlySettleFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "evidenceOfIncomeType" "IncomeEvidenceType" NOT NULL DEFAULT 'BANK_STATEMENT',
ADD COLUMN     "otherFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherFeesPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "processingFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ALTER COLUMN "processingFeesPercent" SET NOT NULL,
ALTER COLUMN "processingFeesPercent" SET DEFAULT 1.00,
ALTER COLUMN "collateralFeesPercent" SET NOT NULL,
ALTER COLUMN "collateralFeesPercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fullName" TEXT;

-- CreateTable
CREATE TABLE "business_incomes" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "monthYear" TEXT NOT NULL,
    "saleRevenue" DECIMAL(15,2) NOT NULL,
    "costOfSale" DECIMAL(15,2) NOT NULL,
    "grossProfit" DECIMAL(15,2) NOT NULL,
    "operExpense" DECIMAL(15,2) NOT NULL,
    "netProfit" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_documents" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_conditions" (
    "id" SERIAL NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "loan_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "subSector" TEXT,
    "smfV1" DECIMAL(5,1) NOT NULL,
    "smfV2" DECIMAL(5,1) NOT NULL,
    "smfV3" DECIMAL(5,1) NOT NULL,
    "bolEconomic" TEXT,
    "bolCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "borrowers_phone_idx" ON "borrowers"("phone");

-- AddForeignKey
ALTER TABLE "business_incomes" ADD CONSTRAINT "business_incomes_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_documents" ADD CONSTRAINT "loan_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_documents" ADD CONSTRAINT "loan_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_conditions" ADD CONSTRAINT "loan_conditions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
