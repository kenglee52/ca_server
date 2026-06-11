-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "nameOnCertificate" TEXT;

-- AlterTable
ALTER TABLE "course_enrollments" ADD COLUMN     "certificateName" TEXT;
