"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserRegistry = void 0;
const common_1 = require("@nestjs/common");
const airbnb_parser_1 = require("./airbnb.parser");
const booking_com_parser_1 = require("./booking-com.parser");
const tripadvisor_parser_1 = require("./tripadvisor.parser");
const website_parser_1 = require("./website.parser");
let ParserRegistry = class ParserRegistry {
    parsers = new Map();
    constructor(airbnb, bookingCom, tripAdvisor, website) {
        for (const parser of [airbnb, bookingCom, tripAdvisor, website]) {
            this.parsers.set(parser.templateTag, parser);
        }
    }
    get(tag) {
        if (!tag)
            return undefined;
        return this.parsers.get(tag);
    }
    resolve(payload, tag) {
        const direct = this.get(tag);
        if (direct && direct.canParse(payload))
            return direct;
        for (const parser of this.parsers.values()) {
            if (parser.canParse(payload))
                return parser;
        }
        return undefined;
    }
    tags() {
        return [...this.parsers.keys()];
    }
};
exports.ParserRegistry = ParserRegistry;
exports.ParserRegistry = ParserRegistry = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [airbnb_parser_1.AirbnbParser,
        booking_com_parser_1.BookingComParser,
        tripadvisor_parser_1.TripAdvisorParser,
        website_parser_1.WebsiteParser])
], ParserRegistry);
//# sourceMappingURL=parser-registry.js.map