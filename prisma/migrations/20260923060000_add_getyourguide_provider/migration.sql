-- GetYourGuide booking confirmation emails are ingested via Gmail Pub/Sub.
-- Add the provider to the BookingSource/BookingProvider channel enum.
ALTER TYPE "BookingProvider" ADD VALUE 'GETYOURGUIDE';