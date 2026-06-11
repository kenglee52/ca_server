-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "existingMonthlyInstallment" DECIMAL(15,2),
ADD COLUMN     "monthlyInterest" DECIMAL(15,2),
ADD COLUMN     "monthlyPrincipal" DECIMAL(15,2),
ADD COLUMN     "processingFeeAmount" DECIMAL(15,2),
ADD COLUMN     "totalMonthlyInstallment" DECIMAL(15,2);
