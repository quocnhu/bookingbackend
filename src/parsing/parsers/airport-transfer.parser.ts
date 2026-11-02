import { Injectable } from '@nestjs/common';
import { TourType } from '@prisma/client';
import { isAirportTransferMail } from '../airport-transfer.util';
import type { BookingFields } from '../validation/booking-fields.schema';
import { AdvancedViatorParser } from './advanced-viator.parser';

/**
 * Viator/Tripadvisor airport-transfer conversation mails.
 *
 * An airport transfer is always a private service, so the booking is forced to
 * PRIVATE_TOUR even when the product option ("Transfer to Airport") does not
 * contain the word "private". Everything else is the same message-centre
 * template handled by `AdvancedViatorParser`.
 */
@Injectable()
export class AirportTransferParser extends AdvancedViatorParser {
  readonly templateTag = 'airportTransfer';

  canParse(payload: Record<string, unknown>): boolean {
    return super.canParse(payload) && isAirportTransferMail(payload);
  }

  extract(payload: Record<string, unknown>): BookingFields | null {
    const fields = super.extract(payload);
    if (!fields) return null;

    fields.tourType = TourType.PRIVATE_TOUR;
    fields.extra = {
      ...(fields.extra ?? {}),
      template: this.templateTag,
      airportTransfer: true,
    };

    const booking = payload.booking;
    if (booking && typeof booking === 'object') {
      (booking as Record<string, unknown>).tourType = TourType.PRIVATE_TOUR;
      (booking as Record<string, unknown>).airportTransfer = true;
    }

    return fields;
  }
}
