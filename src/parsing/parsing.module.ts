import { Module } from '@nestjs/common';
import { RawDataModule } from '@/raw-data/raw-data.module';
import { BookingModule } from '@/booking/booking.module';
import { QueuesModule } from '@/queues/queues.module';
import { ParsingProcessor } from './parsing.processor';
import { ParsingQueue } from './parsing.queue';
import { ParserRegistry } from './parsers/parser-registry';
import { AirbnbParser } from './parsers/airbnb.parser';
import { BookingComParser } from './parsers/booking-com.parser';
import { TripAdvisorParser } from './parsers/tripadvisor.parser';
import { WebsiteParser } from './parsers/website.parser';

@Module({
  imports: [RawDataModule, BookingModule, QueuesModule],
  providers: [
    ParsingProcessor,
    ParsingQueue,
    ParserRegistry,
    AirbnbParser,
    BookingComParser,
    TripAdvisorParser,
    WebsiteParser,
  ],
  exports: [ParsingQueue],
})
export class ParsingModule {}
