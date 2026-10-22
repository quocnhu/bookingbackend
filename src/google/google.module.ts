import { Module } from '@nestjs/common';
import { GmailAuthService } from '@/ingestion/gmail-auth.provider';

/**
 * Shared Google API clients.
 *
 * Kept out of IngestionModule so that BookingModule can send mail through the
 * tracked mailbox without importing the ingestion pipeline (which imports
 * BookingModule and would create a module cycle).
 */
@Module({
  providers: [GmailAuthService],
  exports: [GmailAuthService],
})
export class GoogleModule {}
