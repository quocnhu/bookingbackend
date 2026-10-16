"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSED_SOURCES = void 0;
exports.validateBookingFields = validateBookingFields;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const template_booking_dto_1 = require("./template-booking.dto");
Object.defineProperty(exports, "PARSED_SOURCES", { enumerable: true, get: function () { return template_booking_dto_1.PARSED_SOURCES; } });
function validateBookingFields(fields) {
    const dto = (0, class_transformer_1.plainToInstance)(template_booking_dto_1.TemplateBookingDto, fields);
    const violations = (0, class_validator_1.validateSync)(dto, {
        skipMissingProperties: false,
        whitelist: false,
        forbidNonWhitelisted: false,
    });
    const errors = [];
    for (const violation of violations) {
        errors.push(...Object.values(violation.constraints ?? {}));
        if (violation.children?.length) {
            for (const child of violation.children) {
                errors.push(...Object.values(child.constraints ?? {}));
            }
        }
    }
    if (fields.startingDate && Number.isNaN(Date.parse(fields.startingDate))) {
        errors.push(`Invalid startingDate: ${fields.startingDate}`);
    }
    if (fields.totalPax != null &&
        (!Number.isFinite(fields.totalPax) || fields.totalPax < 0)) {
        errors.push(`Invalid totalPax: ${fields.totalPax}`);
    }
    if (fields.latitude != null && !Number.isFinite(fields.latitude)) {
        errors.push(`Invalid latitude: ${fields.latitude}`);
    }
    if (fields.longitude != null && !Number.isFinite(fields.longitude)) {
        errors.push(`Invalid longitude: ${fields.longitude}`);
    }
    if (errors.length)
        return { valid: false, errors };
    return { valid: true, errors: [], data: dto };
}
//# sourceMappingURL=booking-fields.schema.js.map