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
exports.QuerySettlementDto = exports.UpdateSettlementDto = exports.ExpenseItemDto = exports.CreateSettlementDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
class CreateSettlementDto {
    assignmentId;
    payeeType;
    providerId;
    userId;
    baseAmount;
    allowance;
    deduction;
    periodName;
    notes;
    expenseItems;
}
exports.CreateSettlementDto = CreateSettlementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PayeeType),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "payeeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "userId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSettlementDto.prototype, "baseAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSettlementDto.prototype, "allowance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSettlementDto.prototype, "deduction", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "periodName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    __metadata("design:type", Array)
], CreateSettlementDto.prototype, "expenseItems", void 0);
class ExpenseItemDto {
    category;
    description;
    amount;
    receiptUrl;
}
exports.ExpenseItemDto = ExpenseItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExpenseItemDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExpenseItemDto.prototype, "description", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ExpenseItemDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExpenseItemDto.prototype, "receiptUrl", void 0);
class UpdateSettlementDto {
    status;
    allowance;
    deduction;
    periodName;
    notes;
}
exports.UpdateSettlementDto = UpdateSettlementDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.SettlementStatus),
    __metadata("design:type", String)
], UpdateSettlementDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateSettlementDto.prototype, "allowance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateSettlementDto.prototype, "deduction", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettlementDto.prototype, "periodName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSettlementDto.prototype, "notes", void 0);
class QuerySettlementDto extends pagination_dto_1.PaginationDto {
    status;
    payeeType;
}
exports.QuerySettlementDto = QuerySettlementDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.SettlementStatus),
    __metadata("design:type", String)
], QuerySettlementDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PayeeType),
    __metadata("design:type", String)
], QuerySettlementDto.prototype, "payeeType", void 0);
//# sourceMappingURL=settlement.dto.js.map