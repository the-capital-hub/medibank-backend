-- CreateTable
CREATE TABLE "UserAppointment" (
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

    CONSTRAINT "UserAppointment_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAppointment_appointmentId_key" ON "UserAppointment"("appointmentId");

-- CreateIndex
CREATE INDEX "UserAppointment_userId_idx" ON "UserAppointment"("userId");

-- CreateIndex
CREATE INDEX "UserAppointment_createdById_idx" ON "UserAppointment"("createdById");

-- CreateIndex
CREATE INDEX "UserAppointment_updatedById_idx" ON "UserAppointment"("updatedById");

-- AddForeignKey
ALTER TABLE "UserAppointment" ADD CONSTRAINT "UserAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppointment" ADD CONSTRAINT "UserAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppointment" ADD CONSTRAINT "UserAppointment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
