-- AlterTable: add office_hours and extra_hours to support_tickets
ALTER TABLE "support_tickets" ADD COLUMN "office_hours" DECIMAL(10,2);
ALTER TABLE "support_tickets" ADD COLUMN "extra_hours" DECIMAL(10,2);
