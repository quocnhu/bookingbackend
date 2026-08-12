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
exports.WebsiteParser = void 0;
const common_1 = require("@nestjs/common");
const booking_normalizer_service_1 = require("../booking-normalizer.service");
let WebsiteParser = class WebsiteParser {
    normalizer;
    templateTag = 'website';
    constructor(normalizer) {
        this.normalizer = normalizer;
    }
    canParse(payload) {
        const hasBooking = Boolean(payload.booking ?? payload.parsedBooking);
        const rawSource = payload.source ?? payload.templateTag;
        const source = typeof rawSource === 'string' ? rawSource.toLowerCase() : '';
        return (hasBooking &&
            (source === 'website' || source === '' || source === 'unknown'));
    }
    extract(payload) {
        const result = this.normalizer.normalize(payload, 'website');
        return result.clean ? result.data : null;
    }
};
exports.WebsiteParser = WebsiteParser;
exports.WebsiteParser = WebsiteParser = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_normalizer_service_1.BookingNormalizerService])
], WebsiteParser);
//# sourceMappingURL=website.parser.js.map