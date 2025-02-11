-- CreateTable
CREATE TABLE "userAppointment" (
    "ID" BIGSERIAL NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "selectDate" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "PatientName" TEXT NOT NULL,
    "remarks" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdById" BIGINT NOT NULL,
    "updatedById" BIGINT,

    CONSTRAINT "userAppointment_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE INDEX "userAppointment_userId_idx" ON "userAppointment"("userId");

-- CreateIndex
CREATE INDEX "userAppointment_createdById_idx" ON "userAppointment"("createdById");

-- CreateIndex
CREATE INDEX "userAppointment_updatedById_idx" ON "userAppointment"("updatedById");

-- AddForeignKey
ALTER TABLE "userAppointment" ADD CONSTRAINT "userAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userAppointment" ADD CONSTRAINT "userAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userAppointment" ADD CONSTRAINT "userAppointment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
