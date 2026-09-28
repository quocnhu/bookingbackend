import type { TemplateParser } from './parser.interface';
import { AirbnbParser } from './airbnb.parser';
import { BookingComParser } from './booking-com.parser';
import { GetYourGuideParser } from './getyourguide.parser';
import { TripAdvisorParser } from './tripadvisor.parser';
import { WebsiteParser } from './website.parser';
export declare class ParserRegistry {
    private readonly parsers;
    constructor(airbnb: AirbnbParser, bookingCom: BookingComParser, getYourGuide: GetYourGuideParser, tripAdvisor: TripAdvisorParser, website: WebsiteParser);
    get(tag?: string | null): TemplateParser | undefined;
    resolve(payload: Record<string, unknown>, tag?: string | null): TemplateParser | undefined;
    tags(): string[];
}
