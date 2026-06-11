/*
  Warnings:

  - You are about to drop the column `businessDistrict` on the `borrowers` table. All the data in the column will be lost.
  - You are about to drop the column `businessProvince` on the `borrowers` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `borrowers` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `borrowers` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `borrowers` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `borrowers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `borrowers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `borrowers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Title" AS ENUM ('THAO', 'NANG');

-- AlterTable
ALTER TABLE "borrowers" DROP COLUMN "businessDistrict",
DROP COLUMN "businessProvince",
DROP COLUMN "district",
DROP COLUMN "fullName",
DROP COLUMN "province",
ADD COLUMN     "businessDistrictId" INTEGER,
ADD COLUMN     "businessProvinceId" INTEGER,
ADD COLUMN     "districtId" INTEGER,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "provinceId" INTEGER,
ADD COLUMN     "title" "Title" NOT NULL;

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE INDEX "districts_provinceId_idx" ON "districts"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "districts_provinceId_name_key" ON "districts"("provinceId", "name");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_businessProvinceId_fkey" FOREIGN KEY ("businessProvinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_businessDistrictId_fkey" FOREIGN KEY ("businessDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
