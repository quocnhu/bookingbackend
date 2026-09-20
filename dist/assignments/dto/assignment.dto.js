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
exports.SettlementSummaryDto = exports.FinalizeAssignmentDto = exports.BookingSettlementInputDto = exports.FinalizeServiceDto = exports.VerifyTourReportDto = exports.EvidenceImageDto = exports.SubmitTourReportDto = exports.QueryAssignmentDto = exports.MoveBookingDto = exports.ReorderBookingsDto = exports.AssignBookingsDto = exports.SetBoardOriginDto = exports.UpdateAssignmentStatusDto = exports.UpdateAssignmentDto = exports.CreateAssignmentDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("@/common/dto/pagination.dto");
const client_1 = require("@prisma/client");
class CreateAssignmentDto {
    code;
    tourName;
    startDate;
    endDate;
    vehicleId;
    providerId;
    driverId;
    guideId;
    status;
    sequenceIndex;
    priceOverride;
    tripNotes;
}
exports.CreateAssignmentDto = CreateAssignmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "tourName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateAssignmentDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateAssignmentDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "guideId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssignmentStatus),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateAssignmentDto.prototype, "sequenceIndex", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateAssignmentDto.prototype, "priceOverride", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAssignmentDto.prototype, "tripNotes", void 0);
class UpdateAssignmentDto {
    code;
    tourName;
    startDate;
    endDate;
    vehicleId;
    providerId;
    driverId;
    guideId;
    status;
    sequenceIndex;
    priceOverride;
    tripNotes;
}
exports.UpdateAssignmentDto = UpdateAssignmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "tourName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateAssignmentDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateAssignmentDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "guideId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssignmentStatus),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateAssignmentDto.prototype, "sequenceIndex", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateAssignmentDto.prototype, "priceOverride", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAssignmentDto.prototype, "tripNotes", void 0);
class UpdateAssignmentStatusDto {
    status;
}
exports.UpdateAssignmentStatusDto = UpdateAssignmentStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.AssignmentStatus),
    __metadata("design:type", String)
], UpdateAssignmentStatusDto.prototype, "status", void 0);
class SetBoardOriginDto {
    origin;
}
exports.SetBoardOriginDto = SetBoardOriginDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.AssignmentOrigin),
    __metadata("design:type", String)
], SetBoardOriginDto.prototype, "origin", void 0);
class AssignBookingsDto {
    bookingIds;
}
exports.AssignBookingsDto = AssignBookingsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AssignBookingsDto.prototype, "bookingIds", void 0);
class ReorderBookingsDto {
    bookingIds;
}
exports.ReorderBookingsDto = ReorderBookingsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ReorderBookingsDto.prototype, "bookingIds", void 0);
class MoveBookingDto {
    toAssignmentId;
}
exports.MoveBookingDto = MoveBookingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MoveBookingDto.prototype, "toAssignmentId", void 0);
class QueryAssignmentDto extends pagination_dto_1.PaginationDto {
    status;
    vehicleId;
    driverId;
    guideId;
    sortOrder;
}
exports.QueryAssignmentDto = QueryAssignmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssignmentStatus),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "guideId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "sortOrder", void 0);
class SubmitTourReportDto {
    actualPax;
    pickupNotes;
    distanceKm;
    fuelCost;
    tollParking;
    notes;
    evidenceImages;
}
exports.SubmitTourReportDto = SubmitTourReportDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SubmitTourReportDto.prototype, "actualPax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitTourReportDto.prototype, "pickupNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SubmitTourReportDto.prototype, "distanceKm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitTourReportDto.prototype, "fuelCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitTourReportDto.prototype, "tollParking", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitTourReportDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EvidenceImageDto),
    __metadata("design:type", Array)
], SubmitTourReportDto.prototype, "evidenceImages", void 0);
class EvidenceImageDto {
    name;
    url;
    ext;
    uploadedAt;
    uploadedByName;
}
exports.EvidenceImageDto = EvidenceImageDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvidenceImageDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvidenceImageDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvidenceImageDto.prototype, "ext", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvidenceImageDto.prototype, "uploadedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EvidenceImageDto.prototype, "uploadedByName", void 0);
class VerifyTourReportDto {
    status;
    verificationNotes;
}
exports.VerifyTourReportDto = VerifyTourReportDto;
__decorate([
    (0, class_validator_1.IsIn)(['VERIFIED', 'REJECTED']),
    __metadata("design:type", String)
], VerifyTourReportDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyTourReportDto.prototype, "verificationNotes", void 0);
class FinalizeServiceDto {
    categoryId;
    name;
    amount;
}
exports.FinalizeServiceDto = FinalizeServiceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FinalizeServiceDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FinalizeServiceDto.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FinalizeServiceDto.prototype, "amount", void 0);
class BookingSettlementInputDto {
    bookingId;
    collect;
    refund;
}
exports.BookingSettlementInputDto = BookingSettlementInputDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BookingSettlementInputDto.prototype, "bookingId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BookingSettlementInputDto.prototype, "collect", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BookingSettlementInputDto.prototype, "refund", void 0);
class FinalizeAssignmentDto {
    collectedAmount;
    refundedAmount;
    services;
    evidenceImages;
    bookingSettlements;
}
exports.FinalizeAssignmentDto = FinalizeAssignmentDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FinalizeAssignmentDto.prototype, "collectedAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FinalizeAssignmentDto.prototype, "refundedAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FinalizeServiceDto),
    __metadata("design:type", Array)
], FinalizeAssignmentDto.prototype, "services", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EvidenceImageDto),
    __metadata("design:type", Array)
], FinalizeAssignmentDto.prototype, "evidenceImages", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BookingSettlementInputDto),
    __metadata("design:type", Array)
], FinalizeAssignmentDto.prototype, "bookingSettlements", void 0);
class SettlementSummaryDto {
    from;
    to;
    guideId;
    driverId;
}
exports.SettlementSummaryDto = SettlementSummaryDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SettlementSummaryDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SettlementSummaryDto.prototype, "to", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SettlementSummaryDto.prototype, "guideId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SettlementSummaryDto.prototype, "driverId", void 0);
//# sourceMappingURL=assignment.dto.js.map