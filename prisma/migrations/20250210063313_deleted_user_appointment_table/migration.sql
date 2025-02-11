/*
  Warnings:

  - You are about to drop the `userAppointment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "userAppointment" DROP CONSTRAINT "userAppointment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "userAppointment" DROP CONSTRAINT "userAppointment_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "userAppointment" DROP CONSTRAINT "userAppointment_userId_fkey";

-- DropTable
DROP TABLE "userAppointment";
