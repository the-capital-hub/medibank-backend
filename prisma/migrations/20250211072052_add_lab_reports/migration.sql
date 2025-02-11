-- CreateTable
CREATE TABLE "UserLabReport" (
    "ID" BIGSERIAL NOT NULL,
    "labReportId" TEXT NOT NULL,
    "labReportType" TEXT NOT NULL,
    "selectDate" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "selectFamilyMember" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "uploadReport" TEXT,
    "labImage" TEXT,
    "createdById" BIGINT NOT NULL,
    "updatedById" BIGINT,

    CONSTRAINT "UserLabReport_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLabReport_labReportId_key" ON "UserLabReport"("labReportId");

-- CreateIndex
CREATE INDEX "UserLabReport_userId_idx" ON "UserLabReport"("userId");

-- CreateIndex
CREATE INDEX "UserLabReport_createdById_idx" ON "UserLabReport"("createdById");

-- CreateIndex
CREATE INDEX "UserLabReport_updatedById_idx" ON "UserLabReport"("updatedById");

-- AddForeignKey
ALTER TABLE "UserLabReport" ADD CONSTRAINT "UserLabReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLabReport" ADD CONSTRAINT "UserLabReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLabReport" ADD CONSTRAINT "UserLabReport_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
