/*
  Warnings:

  - You are about to drop the column `extra_hours` on the `support_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `office_hours` on the `support_tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "support_tickets" DROP COLUMN "extra_hours",
DROP COLUMN "office_hours",
ADD COLUMN     "extraHours" DECIMAL(10,2),
ADD COLUMN     "officeHours" DECIMAL(10,2);
