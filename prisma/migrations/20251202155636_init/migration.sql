/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `companyDetails` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `userType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Application` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `File` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobOpening` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobOpeningSkill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobSearch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobSearchSkill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Skill` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_seekerId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropForeignKey
ALTER TABLE "JobOpening" DROP CONSTRAINT "JobOpening_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "JobOpening" DROP CONSTRAINT "JobOpening_companyId_fkey";

-- DropForeignKey
ALTER TABLE "JobOpeningSkill" DROP CONSTRAINT "JobOpeningSkill_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobOpeningSkill" DROP CONSTRAINT "JobOpeningSkill_skillId_fkey";

-- DropForeignKey
ALTER TABLE "JobSearch" DROP CONSTRAINT "JobSearch_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "JobSearch" DROP CONSTRAINT "JobSearch_seekerId_fkey";

-- DropForeignKey
ALTER TABLE "JobSearchSkill" DROP CONSTRAINT "JobSearchSkill_searchId_fkey";

-- DropForeignKey
ALTER TABLE "JobSearchSkill" DROP CONSTRAINT "JobSearchSkill_skillId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "createdAt",
ADD COLUMN     "color" TEXT DEFAULT '#3B82F6',
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio",
DROP COLUMN "companyDetails",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "fullName",
DROP COLUMN "location",
DROP COLUMN "password",
DROP COLUMN "phone",
DROP COLUMN "profileUrl",
DROP COLUMN "updatedAt",
DROP COLUMN "userType",
DROP COLUMN "verified",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'admin';

-- DropTable
DROP TABLE "Application";

-- DropTable
DROP TABLE "File";

-- DropTable
DROP TABLE "JobOpening";

-- DropTable
DROP TABLE "JobOpeningSkill";

-- DropTable
DROP TABLE "JobSearch";

-- DropTable
DROP TABLE "JobSearchSkill";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Skill";

-- DropEnum
DROP TYPE "ApplicationStatus";

-- DropEnum
DROP TYPE "Availability";

-- DropEnum
DROP TYPE "FileType";

-- DropEnum
DROP TYPE "JobStatus";

-- DropEnum
DROP TYPE "JobType";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "UserType";

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "profile_picture" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "line_id" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "research_gate" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Research" (
    "id" SERIAL NOT NULL,
    "title_lao" TEXT NOT NULL,
    "title_en" TEXT,
    "abstract" TEXT,
    "year" INTEGER NOT NULL,
    "publication" TEXT,
    "keywords" TEXT,
    "file_pdf" TEXT,
    "cover_image" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchCategory" (
    "researchId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ResearchCategory_pkey" PRIMARY KEY ("researchId","categoryId")
);

-- CreateTable
CREATE TABLE "ResearchFile" (
    "id" SERIAL NOT NULL,
    "researchId" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AddForeignKey
ALTER TABLE "ResearchCategory" ADD CONSTRAINT "ResearchCategory_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchCategory" ADD CONSTRAINT "ResearchCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchFile" ADD CONSTRAINT "ResearchFile_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "Research"("id") ON DELETE CASCADE ON UPDATE CASCADE;
