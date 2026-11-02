"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirportTransferParser = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const airport_transfer_util_1 = require("../airport-transfer.util");
const advanced_viator_parser_1 = require("./advanced-viator.parser");
let AirportTransferParser = class AirportTransferParser extends advanced_viator_parser_1.AdvancedViatorParser {
    templateTag = 'airportTransfer';
    canParse(payload) {
        return super.canParse(payload) && (0, airport_transfer_util_1.isAirportTransferMail)(payload);
    }
    extract(payload) {
        const fields = super.extract(payload);
        if (!fields)
            return null;
        fields.tourType = client_1.TourType.PRIVATE_TOUR;
        fields.extra = {
            ...(fields.extra ?? {}),
            template: this.templateTag,
            airportTransfer: true,
        };
        const booking = payload.booking;
        if (booking && typeof booking === 'object') {
            booking.tourType = client_1.TourType.PRIVATE_TOUR;
            booking.airportTransfer = true;
        }
        return fields;
    }
};
exports.AirportTransferParser = AirportTransferParser;
exports.AirportTransferParser = AirportTransferParser = __decorate([
    (0, common_1.Injectable)()
], AirportTransferParser);
//# sourceMappingURL=airport-transfer.parser.js.map