/*
  Warnings:

  - Added the required column `MBID` to the `AddFamilyMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AddFamilyMember" ADD COLUMN     "MBID" TEXT NOT NULL;
