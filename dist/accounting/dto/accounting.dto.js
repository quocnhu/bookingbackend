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
exports.VoidPeriodDto = exports.LimitQueryDto = exports.PeriodIdParamDto = exports.ListPeopleQueryDto = exports.CreateSettlementCategoryDto = exports.UpdateSettlementDto = exports.CreateSettlementDto = exports.ReverseTourMoneyDto = exports.ReverseSettlementDto = exports.RejectMoneyDto = exports.VerifyTourMoneyDto = exports.ExportPeriodDto = exports.PeriodQueryDto = exports.PayeeTypeDto = void 0;
const class_validator_1 = require("class-validator");
const PAYABLE_ROLES = ['TOUR_GUIDE', 'DRIVER'];
const PAYEE_TYPES = [
    'TRANSPORT_PROVIDER',
    'COMPANY_GUIDE',
    'COMPANY_DRIVER',
    'FREELANCE',
];
class PayeeTypeDto {
    payeeType;
}
exports.PayeeTypeDto = PayeeTypeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PAYEE_TYPES),
    __metadata("design:type", Object)
], PayeeTypeDto.prototype, "payeeType", void 0);
class PeriodQueryDto {
    fromDate;
    toDate;
    payeeType;
    payeeId;
    personId;
    unpaidOnly;
}
exports.PeriodQueryDto = PeriodQueryDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PeriodQueryDto.prototype, "fromDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PeriodQueryDto.prototype, "toDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PAYEE_TYPES),
    __metadata("design:type", Object)
], PeriodQueryDto.prototype, "payeeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PeriodQueryDto.prototype, "payeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PeriodQueryDto.prototype, "personId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PeriodQueryDto.prototype, "unpaidOnly", void 0);
class ExportPeriodDto {
    fromDate;
    toDate;
    payeeType;
    payeeId;
    note;
}
exports.ExportPeriodDto = ExportPeriodDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExportPeriodDto.prototype, "fromDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExportPeriodDto.prototype, "toDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PAYEE_TYPES),
    __metadata("design:type", Object)
], ExportPeriodDto.prototype, "payeeType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExportPeriodDto.prototype, "payeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ExportPeriodDto.prototype, "note", void 0);
class VerifyTourMoneyDto {
    note;
    payableToId;
}
exports.VerifyTourMoneyDto = VerifyTourMoneyDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], VerifyTourMoneyDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyTourMoneyDto.prototype, "payableToId", void 0);
class RejectMoneyDto {
    reason;
}
exports.RejectMoneyDto = RejectMoneyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5, { message: 'reason must be at least 5 characters' }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RejectMoneyDto.prototype, "reason", void 0);
class ReverseSettlementDto {
    note;
}
exports.ReverseSettlementDto = ReverseSettlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ReverseSettlementDto.prototype, "note", void 0);
class ReverseTourMoneyDto {
    note;
}
exports.ReverseTourMoneyDto = ReverseTourMoneyDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], ReverseTourMoneyDto.prototype, "note", void 0);
class CreateSettlementDto {
    amount;
    note;
    categoryId;
    bookingId;
}
exports.CreateSettlementDto = CreateSettlementDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.0000001),
    __metadata("design:type", Number)
], CreateSettlementDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "bookingId", void 0);
class UpdateSettlementDto {
    amount;
    note;
    categoryId;
}
exports.UpdateSettlementDto = UpdateSettlementDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.0000001),
    __metadata("design:type", Number)
], UpdateSettlementDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateSettlementDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettlementDto.prototype, "categoryId", void 0);
class CreateSettlementCategoryDto {
    code;
    name;
    flowType;
}
exports.CreateSettlementCategoryDto = CreateSettlementCategoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CreateSettlementCategoryDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateSettlementCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['COLLECT_MONEY', 'PAY_MONEY']),
    __metadata("design:type", String)
], CreateSettlementCategoryDto.prototype, "flowType", void 0);
class ListPeopleQueryDto {
    role;
}
exports.ListPeopleQueryDto = ListPeopleQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(PAYABLE_ROLES),
    __metadata("design:type", Object)
], ListPeopleQueryDto.prototype, "role", void 0);
class PeriodIdParamDto {
    id;
}
exports.PeriodIdParamDto = PeriodIdParamDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PeriodIdParamDto.prototype, "id", void 0);
class LimitQueryDto {
    limit;
}
exports.LimitQueryDto = LimitQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], LimitQueryDto.prototype, "limit", void 0);
class VoidPeriodDto {
    reason;
}
exports.VoidPeriodDto = VoidPeriodDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], VoidPeriodDto.prototype, "reason", void 0);
//# sourceMappingURL=accounting.dto.js.map