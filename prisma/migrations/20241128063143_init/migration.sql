-- CreateTable
CREATE TABLE "UserMaster" (
    "ID" BIGSERIAL NOT NULL,
    "MBID" TEXT NOT NULL,
    "Password" TEXT NOT NULL,
    "EmailID" TEXT NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT,
    "Gender" BOOLEAN NOT NULL,
    "MobileNo" TEXT NOT NULL,
    "City" TEXT,
    "Address" TEXT,
    "State" TEXT,
    "UserType" BIGINT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedOn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMaster_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMaster_MBID_key" ON "UserMaster"("MBID");

-- CreateIndex
CREATE UNIQUE INDEX "UserMaster_EmailID_key" ON "UserMaster"("EmailID");

-- CreateIndex
CREATE UNIQUE INDEX "UserMaster_MobileNo_key" ON "UserMaster"("MobileNo");
