-- CreateTable
CREATE TABLE "AddFamilyMember" (
    "ID" BIGSERIAL NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "familyMemberName" TEXT NOT NULL,
    "familyMemberRelation" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" TIMESTAMP(3) NOT NULL,
    "createdById" BIGINT NOT NULL,
    "updatedById" BIGINT,

    CONSTRAINT "AddFamilyMember_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddFamilyMember_familyMemberId_key" ON "AddFamilyMember"("familyMemberId");

-- CreateIndex
CREATE INDEX "AddFamilyMember_userId_idx" ON "AddFamilyMember"("userId");

-- CreateIndex
CREATE INDEX "AddFamilyMember_createdById_idx" ON "AddFamilyMember"("createdById");

-- CreateIndex
CREATE INDEX "AddFamilyMember_updatedById_idx" ON "AddFamilyMember"("updatedById");

-- AddForeignKey
ALTER TABLE "AddFamilyMember" ADD CONSTRAINT "AddFamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddFamilyMember" ADD CONSTRAINT "AddFamilyMember_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserMaster"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddFamilyMember" ADD CONSTRAINT "AddFamilyMember_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "UserMaster"("ID") ON DELETE SET NULL ON UPDATE CASCADE;
