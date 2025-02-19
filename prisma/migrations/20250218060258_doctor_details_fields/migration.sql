-- CreateTable
CREATE TABLE "DoctorDetails" (
    "ID" BIGSERIAL NOT NULL,
    "licenseRegistrationNo" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "collegeName" TEXT NOT NULL,
    "courseYear" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "createdById" BIGINT NOT NULL,
    "updatedById" BIGINT,

    CONSTRAINT "DoctorDetails_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE INDEX "DoctorDetails_userId_idx" ON "DoctorDetails"("userId");

-- CreateIndex
CREATE INDEX "DoctorDetails_createdById_idx" ON "DoctorDetails"("createdById");

-- CreateIndex
CREATE INDEX "DoctorDetails_updatedById_idx" ON "DoctorDetails"("updatedById");

-- AddForeignKey
ALTER TABLE "DoctorDetails" ADD CONSTRAINT "DoctorDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorDetails" ADD CONSTRAINT "DoctorDetails_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorDetails" ADD CONSTRAINT "DoctorDetails_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
