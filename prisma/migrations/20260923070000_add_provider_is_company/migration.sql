-- Thêm cờ isCompany đánh dấu đội xe nội bộ của công ty (Company Fleet).
ALTER TABLE "TransportationProvider" ADD COLUMN "isCompany" BOOLEAN NOT NULL DEFAULT false;