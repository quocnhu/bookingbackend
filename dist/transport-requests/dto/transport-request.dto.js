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
exports.QueryTransportRequestDto = exports.UpdateProviderAssignmentModeDto = exports.UpdateTransportRequestSettingsDto = exports.DeclineTransportRequestDto = exports.AssignTransportRequestDto = exports.OverrideTransportRequestDto = exports.CancelTransportRequestDto = exports.SendTransportRequestDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
class SendTransportRequestDto {
    providerId;
    note;
    deadline;
}
exports.SendTransportRequestDto = SendTransportRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendTransportRequestDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendTransportRequestDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendTransportRequestDto.prototype, "deadline", void 0);
class CancelTransportRequestDto {
    note;
}
exports.CancelTransportRequestDto = CancelTransportRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelTransportRequestDto.prototype, "note", void 0);
class OverrideTransportRequestDto {
    providerId;
    driverId;
    vehicleId;
    note;
}
exports.OverrideTransportRequestDto = OverrideTransportRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideTransportRequestDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideTransportRequestDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideTransportRequestDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideTransportRequestDto.prototype, "note", void 0);
class AssignTransportRequestDto {
    driverId;
    vehicleId;
    note;
}
exports.AssignTransportRequestDto = AssignTransportRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTransportRequestDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTransportRequestDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignTransportRequestDto.prototype, "note", void 0);
class DeclineTransportRequestDto {
    reason;
}
exports.DeclineTransportRequestDto = DeclineTransportRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeclineTransportRequestDto.prototype, "reason", void 0);
class UpdateTransportRequestSettingsDto {
    enabled;
    sendDaysBefore;
    sendTime;
    deadlineTime;
    minLeadHours;
}
exports.UpdateTransportRequestSettingsDto = UpdateTransportRequestSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTransportRequestSettingsDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(30),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateTransportRequestSettingsDto.prototype, "sendDaysBefore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(HHMM_PATTERN, { message: 'sendTime must be HH:mm' }),
    __metadata("design:type", String)
], UpdateTransportRequestSettingsDto.prototype, "sendTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(HHMM_PATTERN, { message: 'deadlineTime must be HH:mm' }),
    __metadata("design:type", String)
], UpdateTransportRequestSettingsDto.prototype, "deadlineTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(72),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateTransportRequestSettingsDto.prototype, "minLeadHours", void 0);
class UpdateProviderAssignmentModeDto {
    providerId;
    assignmentMode;
}
exports.UpdateProviderAssignmentModeDto = UpdateProviderAssignmentModeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProviderAssignmentModeDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ProviderAssignmentMode),
    __metadata("design:type", String)
], UpdateProviderAssignmentModeDto.prototype, "assignmentMode", void 0);
class QueryTransportRequestDto {
    status;
    providerId;
    search;
    from;
    to;
}
exports.QueryTransportRequestDto = QueryTransportRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TransportRequestStatus),
    __metadata("design:type", String)
], QueryTransportRequestDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransportRequestDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransportRequestDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransportRequestDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTransportRequestDto.prototype, "to", void 0);
//# sourceMappingURL=transport-request.dto.js.map