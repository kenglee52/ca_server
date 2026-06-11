/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profile_url` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERN', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IMMEDIATE', 'ONE_MONTH', 'THREE_MONTHS');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION', 'JOB_MATCH', 'STATUS_UPDATE');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('RESUME', 'PORTFOLIO', 'CERTIFICATE');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "profile_url",
DROP COLUMN "role",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "companyDetails" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "profileUrl" TEXT,
ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpening" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "salaryRange" TEXT,
    "location" TEXT,
    "jobType" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "categoryId" INTEGER,
    "applicationDeadline" TIMESTAMP(3),
    "remoteOption" BOOLEAN NOT NULL DEFAULT false,
    "posterUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSearch" (
    "id" SERIAL NOT NULL,
    "seekerId" INTEGER NOT NULL,
    "desiredTitle" TEXT NOT NULL,
    "skills" TEXT,
    "experience" INTEGER,
    "expectedSalary" TEXT,
    "locationPref" TEXT,
    "availability" "Availability",
    "categoryId" INTEGER,
    "educationLevel" TEXT,
    "preferredJobType" "JobType",
    "cvUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpeningSkill" (
    "jobId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "JobOpeningSkill_pkey" PRIMARY KEY ("jobId","skillId")
);

-- CreateTable
CREATE TABLE "JobSearchSkill" (
    "searchId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "JobSearchSkill_pkey" PRIMARY KEY ("searchId","skillId")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "seekerId" INTEGER NOT NULL,
    "coverLetter" TEXT,
    "resumeUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "interviewDate" TIMESTAMP(3),
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "relatedId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearch" ADD CONSTRAINT "JobSearch_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearch" ADD CONSTRAINT "JobSearch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpeningSkill" ADD CONSTRAINT "JobOpeningSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpeningSkill" ADD CONSTRAINT "JobOpeningSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearchSkill" ADD CONSTRAINT "JobSearchSkill_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "JobSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSearchSkill" ADD CONSTRAINT "JobSearchSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
