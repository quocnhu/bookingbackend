-- Temporarily default new bookings to PAID (no PayPal handling for now).
ALTER TABLE "Booking" ALTER COLUMN "payment" SET DEFAULT 'PAID';
