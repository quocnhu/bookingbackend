"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsingModule = void 0;
const common_1 = require("@nestjs/common");
const raw_data_module_1 = require("../raw-data/raw-data.module");
const booking_module_1 = require("../booking/booking.module");
const queues_module_1 = require("../queues/queues.module");
const parsing_processor_1 = require("./parsing.processor");
const parsing_queue_1 = require("./parsing.queue");
const parser_registry_1 = require("./parsers/parser-registry");
const airbnb_parser_1 = require("./parsers/airbnb.parser");
const booking_com_parser_1 = require("./parsers/booking-com.parser");
const getyourguide_parser_1 = require("./parsers/getyourguide.parser");
const tripadvisor_parser_1 = require("./parsers/tripadvisor.parser");
const website_parser_1 = require("./parsers/website.parser");
let ParsingModule = class ParsingModule {
};
exports.ParsingModule = ParsingModule;
exports.ParsingModule = ParsingModule = __decorate([
    (0, common_1.Module)({
        imports: [raw_data_module_1.RawDataModule, booking_module_1.BookingModule, queues_module_1.QueuesModule],
        providers: [
            parsing_processor_1.ParsingProcessor,
            parsing_queue_1.ParsingQueue,
            parser_registry_1.ParserRegistry,
            airbnb_parser_1.AirbnbParser,
            booking_com_parser_1.BookingComParser,
            getyourguide_parser_1.GetYourGuideParser,
            tripadvisor_parser_1.TripAdvisorParser,
            website_parser_1.WebsiteParser,
        ],
        exports: [parsing_queue_1.ParsingQueue],
    })
], ParsingModule);
//# sourceMappingURL=parsing.module.js.map