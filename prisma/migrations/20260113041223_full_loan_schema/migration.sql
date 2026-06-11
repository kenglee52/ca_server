/*
  Warnings:

  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amount` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `enrollmentId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `slipImage` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - The `id` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `certificates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_resets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lessons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quizzes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountPaid` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interestPaid` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentDate` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `principalPaid` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('PERSONAL_SALARY_GUARANTEE', 'PERSONAL_WITH_COLLATERAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "CreditGrade" AS ENUM ('A', 'B', 'C', 'D');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'CREDIT_OFFICER';
ALTER TYPE "Role" ADD VALUE 'APPROVER';
ALTER TYPE "Role" ADD VALUE 'VERIFIER';

-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_courseId_fkey";

-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_userId_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_enrollments" DROP CONSTRAINT "course_enrollments_userId_fkey";

-- DropForeignKey
ALTER TABLE "exam_resets" DROP CONSTRAINT "exam_resets_courseId_fkey";

-- DropForeignKey
ALTER TABLE "exam_resets" DROP CONSTRAINT "exam_resets_newCycleId_fkey";

-- DropForeignKey
ALTER TABLE "exam_resets" DROP CONSTRAINT "exam_resets_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "exam_resets" DROP CONSTRAINT "exam_resets_quizId_fkey";

-- DropForeignKey
ALTER TABLE "exam_resets" DROP CONSTRAINT "exam_resets_userId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_attachments" DROP CONSTRAINT "lesson_attachments_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_progress" DROP CONSTRAINT "lesson_progress_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_progress" DROP CONSTRAINT "lesson_progress_userId_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_courseId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_courseId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_cycles" DROP CONSTRAINT "quiz_cycles_quizId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_cycles" DROP CONSTRAINT "quiz_cycles_userId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_questions" DROP CONSTRAINT "quiz_questions_quizId_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_courseId_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_lessonId_fkey";

-- AlterTable
ALTER TABLE "payments" DROP CONSTRAINT "payments_pkey",
DROP COLUMN "amount",
DROP COLUMN "approvedAt",
DROP COLUMN "approvedBy",
DROP COLUMN "courseId",
DROP COLUMN "enrollmentId",
DROP COLUMN "slipImage",
DROP COLUMN "status",
DROP COLUMN "type",
DROP COLUMN "userId",
ADD COLUMN     "amountPaid" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "applicationId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "interestPaid" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "isOnTime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "principalPaid" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "receiptNo" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "emailVerified",
DROP COLUMN "name",
DROP COLUMN "password",
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "certificates";

-- DropTable
DROP TABLE "course_enrollments";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "exam_resets";

-- DropTable
DROP TABLE "lesson_attachments";

-- DropTable
DROP TABLE "lesson_progress";

-- DropTable
DROP TABLE "lessons";

-- DropTable
DROP TABLE "quiz_attempts";

-- DropTable
DROP TABLE "quiz_cycles";

-- DropTable
DROP TABLE "quiz_questions";

-- DropTable
DROP TABLE "quizzes";

-- DropEnum
DROP TYPE "AttachmentKind";

-- DropEnum
DROP TYPE "CycleStatus";

-- DropEnum
DROP TYPE "EnrollmentStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PaymentType";

-- DropEnum
DROP TYPE "QuizType";

-- CreateTable
CREATE TABLE "borrowers" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "maritalStatus" "MaritalStatus",
    "nationality" TEXT NOT NULL DEFAULT 'Lao',
    "education" TEXT,
    "occupation" TEXT,
    "employerName" TEXT,
    "position" TEXT,
    "workingStartDate" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "village" TEXT,
    "district" TEXT,
    "province" TEXT,
    "certificateType" TEXT,
    "certificateNo" TEXT,
    "monthlySalary" DECIMAL(15,2) NOT NULL,
    "householdExpense" DECIMAL(15,2),
    "netIncome" DECIMAL(15,2) NOT NULL,
    "relationshipWithFina" TEXT DEFAULT 'No relationship',
    "coBorrowerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "borrowerId" INTEGER NOT NULL,
    "loanType" "LoanType" NOT NULL DEFAULT 'PERSONAL_SALARY_GUARANTEE',
    "loanPurpose" TEXT NOT NULL,
    "loanAmountRequested" DECIMAL(15,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "interestRatePa" DECIMAL(5,2) NOT NULL,
    "repaymentMode" TEXT NOT NULL DEFAULT 'Flat rate',
    "processingFeesPercent" DECIMAL(5,2),
    "collateralFeesPercent" DECIMAL(5,2),
    "creditHistoryGrade" "CreditGrade" NOT NULL DEFAULT 'A',
    "existingDebt" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "evidenceOfIncome" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "creditScore" INTEGER,
    "dtiRatio" DECIMAL(5,2) NOT NULL,
    "dtiThreshold" DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    "ltvRatio" DECIMAL(5,2),
    "ltvThreshold" DECIMAL(5,2),
    "installmentAmount" DECIMAL(15,2) NOT NULL,
    "totalInterest" DECIMAL(15,2) NOT NULL,
    "totalPrincipalPlusInterest" DECIMAL(15,2) NOT NULL,
    "maxApprovedAmount" DECIMAL(15,2),
    "approvalStatus" "LoanStatus" NOT NULL,
    "assessedById" INTEGER,
    "approvedById" INTEGER,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrower_incomes" (
    "id" SERIAL NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "monthYear" TEXT NOT NULL,
    "grossIncome" DECIMAL(15,2) NOT NULL,
    "netIncome" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrower_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_applicationId_key" ON "assessments"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_coBorrowerId_fkey" FOREIGN KEY ("coBorrowerId") REFERENCES "borrowers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrower_incomes" ADD CONSTRAINT "borrower_incomes_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
