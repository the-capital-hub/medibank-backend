/*
  Warnings:

  - Made the column `sex` on table `UserMaster` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserMaster" ALTER COLUMN "sex" SET NOT NULL,
ALTER COLUMN "sex" SET DATA TYPE TEXT;
