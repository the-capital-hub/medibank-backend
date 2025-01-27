/*
  Warnings:

  - You are about to drop the column `City` on the `UserMaster` table. All the data in the column will be lost.
  - You are about to drop the column `FirstName` on the `UserMaster` table. All the data in the column will be lost.
  - You are about to drop the column `Gender` on the `UserMaster` table. All the data in the column will be lost.
  - You are about to drop the column `LastName` on the `UserMaster` table. All the data in the column will be lost.
  - You are about to drop the column `MobileNo` on the `UserMaster` table. All the data in the column will be lost.
  - You are about to drop the column `State` on the `UserMaster` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mobile_num]` on the table `UserMaster` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullname` to the `UserMaster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobile_num` to the `UserMaster` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserMaster_MobileNo_key";

-- AlterTable
ALTER TABLE "UserMaster" DROP COLUMN "City",
DROP COLUMN "FirstName",
DROP COLUMN "Gender",
DROP COLUMN "LastName",
DROP COLUMN "MobileNo",
DROP COLUMN "State",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "fullname" TEXT NOT NULL,
ADD COLUMN     "mobile_num" TEXT NOT NULL,
ADD COLUMN     "sex" BOOLEAN,
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserMaster_mobile_num_key" ON "UserMaster"("mobile_num");
