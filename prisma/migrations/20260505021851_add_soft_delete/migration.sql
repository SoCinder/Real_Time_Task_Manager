-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
