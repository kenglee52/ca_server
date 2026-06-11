/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Research` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'EXAM_LOCKED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PURCHASE', 'EXAM_RESET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('LESSON', 'FINAL');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('ACTIVE', 'LOCKED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "ResearchCategory" DROP CONSTRAINT "ResearchCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ResearchCategory" DROP CONSTRAINT "ResearchCategory_researchId_fkey";

-- DropForeignKey
ALTER TABLE "ResearchFile" DROP CONSTRAINT "ResearchFile_researchId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Profile";

-- DropTable
DROP TABLE "Research";

-- DropTable
DROP TABLE "ResearchCategory";

-- DropTable
DROP TABLE "ResearchFile";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "attachment" TEXT,
    "duration" INTEGER,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "enrollmentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "slipImage" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "type" "QuizType" NOT NULL,
    "passScore" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isShuffle" BOOLEAN NOT NULL DEFAULT true,
    "timeLimit" INTEGER,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_cycles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "cycleNo" INTEGER NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "newCycleId" TEXT,

    CONSTRAINT "exam_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfPath" TEXT,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_courseId_orderIndex_key" ON "lessons"("courseId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_userId_courseId_key" ON "course_enrollments"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_lessonId_key" ON "quizzes"("lessonId");

-- CreateIndex
CREATE INDEX "quiz_cycles_userId_quizId_idx" ON "quiz_cycles"("userId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_cycles_userId_quizId_cycleNo_key" ON "quiz_cycles"("userId", "quizId", "cycleNo");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_cycleId_attemptNumber_key" ON "quiz_attempts"("cycleId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "exam_resets_paymentId_key" ON "exam_resets"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_resets_newCycleId_key" ON "exam_resets"("newCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_enrollmentId_key" ON "certificates"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateCode_key" ON "certificates"("certificateCode");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_cycles" ADD CONSTRAINT "quiz_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_cycles" ADD CONSTRAINT "quiz_cycles_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "quiz_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_resets" ADD CONSTRAINT "exam_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_resets" ADD CONSTRAINT "exam_resets_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_resets" ADD CONSTRAINT "exam_resets_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_resets" ADD CONSTRAINT "exam_resets_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_resets" ADD CONSTRAINT "exam_resets_newCycleId_fkey" FOREIGN KEY ("newCycleId") REFERENCES "quiz_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
