-- DropForeignKey
ALTER TABLE "TourReport" DROP CONSTRAINT "TourReport_assignmentId_fkey";

-- AddForeignKey
ALTER TABLE "TourReport" ADD CONSTRAINT "TourReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
