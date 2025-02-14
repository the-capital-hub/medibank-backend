/*
  Warnings:

  - You are about to drop the column `vitals` on the `UserAppointment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserAppointment" DROP COLUMN "vitals",
ADD COLUMN     "bloodPres" TEXT,
ADD COLUMN     "bodyTemp" TEXT,
ADD COLUMN     "heartRate" TEXT,
ADD COLUMN     "respRate" TEXT,
ADD COLUMN     "spO2" TEXT;
