/*
  Warnings:

  - You are about to drop the column `status` on the `FieldVerification` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `FieldVerification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleCode" ADD VALUE 'AUDITOR';
ALTER TYPE "RoleCode" ADD VALUE 'CITIZEN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "VerificationStatus" ADD VALUE 'IN_PROGRESS';

-- DropForeignKey
ALTER TABLE "FieldVerification" DROP CONSTRAINT "FieldVerification_verifiedById_fkey";

-- DropIndex
DROP INDEX "Parcel_geometry_gist_idx";

-- DropIndex
DROP INDEX "parcel_geometry_gist";

-- DropIndex
DROP INDEX "Project_geometry_gist_idx";

-- DropIndex
DROP INDEX "project_geometry_gist";

-- AlterTable
ALTER TABLE "FieldVerification" DROP COLUMN "status",
ADD COLUMN     "assignedOfficerId" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "photoReference" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "verifiedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "dataOrigin" TEXT NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "rawSourceMetadata" JSONB,
ADD COLUMN     "rawSourcePayload" JSONB,
ADD COLUMN     "sourceUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "projectType" TEXT;

-- AlterTable
ALTER TABLE "SyncLog" ADD COLUMN     "recordsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordsInserted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordsRejected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordsUpdated" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "FieldVerification_projectId_idx" ON "FieldVerification"("projectId");

-- CreateIndex
CREATE INDEX "FieldVerification_assignedOfficerId_idx" ON "FieldVerification"("assignedOfficerId");

-- CreateIndex
CREATE INDEX "FieldVerification_verificationStatus_idx" ON "FieldVerification"("verificationStatus");

-- CreateIndex
CREATE INDEX "Parcel_circle_idx" ON "Parcel"("circle");

-- CreateIndex
CREATE INDEX "Parcel_sourceSystem_idx" ON "Parcel"("sourceSystem");

-- CreateIndex
CREATE INDEX "Parcel_dagNo_idx" ON "Parcel"("dagNo");

-- CreateIndex
CREATE INDEX "Parcel_pattaNo_idx" ON "Parcel"("pattaNo");

-- CreateIndex
CREATE INDEX "ParcelOwner_name_idx" ON "ParcelOwner"("name");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "ProjectParcel_compensationStatus_idx" ON "ProjectParcel"("compensationStatus");

-- AddForeignKey
ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldVerification" ADD CONSTRAINT "FieldVerification_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
