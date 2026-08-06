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
exports.QueryAssignmentDto = exports.AssignBookingsDto = exports.UpdateAssignmentStatusDto = exports.UpdateAssignmentDto = exports.CreateAssignmentDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
class CreateAssignmentDto {
    code;
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
class AssignBookingsDto {
    bookingIds;
}
exports.AssignBookingsDto = AssignBookingsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AssignBookingsDto.prototype, "bookingIds", void 0);
class QueryAssignmentDto extends pagination_dto_1.PaginationDto {
    q;
    status;
    vehicleId;
    driverId;
    guideId;
}
exports.QueryAssignmentDto = QueryAssignmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAssignmentDto.prototype, "q", void 0);
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
//# sourceMappingURL=assignment.dto.js.map