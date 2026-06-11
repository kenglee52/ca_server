/*
  Warnings:

  - You are about to drop the column `attachment` on the `lessons` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('DOC', 'FILE');

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "attachment";

-- CreateTable
CREATE TABLE "lesson_attachments" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'FILE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_attachments_lessonId_idx" ON "lesson_attachments"("lessonId");

-- AddForeignKey
ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
