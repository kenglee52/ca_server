-- AlterTable
ALTER TABLE "course_enrollments" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isAccessExpired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "accessDurationDays" INTEGER;
