-- CreateTable
CREATE TABLE "UserHospitalReport" (
    "ID" BIGSERIAL NOT NULL,
    "hospitalReportId" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "selectDate" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "PatientName" TEXT NOT NULL,
    "remarks" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "uploadHospitalReport" TEXT,
    "hospitalImage" TEXT,
    "createdById" BIGINT NOT NULL,
    "updatedById" BIGINT,

    CONSTRAINT "UserHospitalReport_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHospitalReport_hospitalReportId_key" ON "UserHospitalReport"("hospitalReportId");

-- CreateIndex
CREATE INDEX "UserHospitalReport_userId_idx" ON "UserHospitalReport"("userId");

-- CreateIndex
CREATE INDEX "UserHospitalReport_createdById_idx" ON "UserHospitalReport"("createdById");

-- CreateIndex
CREATE INDEX "UserHospitalReport_updatedById_idx" ON "UserHospitalReport"("updatedById");

-- AddForeignKey
ALTER TABLE "UserHospitalReport" ADD CONSTRAINT "UserHospitalReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHospitalReport" ADD CONSTRAINT "UserHospitalReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHospitalReport" ADD CONSTRAINT "UserHospitalReport_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
