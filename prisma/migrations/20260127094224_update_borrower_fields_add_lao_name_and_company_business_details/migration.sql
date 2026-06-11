/*
  Warnings:

  - You are about to drop the column `businessName` on the `borrowers` table. All the data in the column will be lost.
  - Added the required column `laoFirstName` to the `borrowers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `laoLastName` to the `borrowers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "borrowers" DROP COLUMN "businessName",
ADD COLUMN     "businessAddressLink" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessRegisterName" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "companyAddressLink" TEXT,
ADD COLUMN     "companyDistrictId" INTEGER,
ADD COLUMN     "companyPhone" TEXT,
ADD COLUMN     "companyProvinceId" INTEGER,
ADD COLUMN     "companyVillage" TEXT,
ADD COLUMN     "currentAddressLink" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "idCardExpiryDate" TIMESTAMP(3),
ADD COLUMN     "laoFirstName" TEXT NOT NULL,
ADD COLUMN     "laoLastName" TEXT NOT NULL;
