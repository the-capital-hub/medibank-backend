/*
  Warnings:

  - You are about to drop the column `uploadReport` on the `UserLabReport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserLabReport" DROP COLUMN "uploadReport",
ADD COLUMN     "uploadLabReport" TEXT;
