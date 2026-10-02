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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const accounting_service_1 = require("./accounting.service");
const accounting_dto_1 = require("./dto/accounting.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AccountingController = class AccountingController {
    accountingService;
    constructor(accountingService) {
        this.accountingService = accountingService;
    }
    listCategories(actor) {
        return this.accountingService.listCategories(actor);
    }
    createCategory(dto, actor) {
        return this.accountingService.createCategory(actor, dto);
    }
    listSettlements(assignmentId, actor) {
        return this.accountingService.listSettlements(actor, assignmentId);
    }
    createSettlement(assignmentId, dto, actor) {
        return this.accountingService.createSettlement(actor, assignmentId, dto);
    }
    updateSettlement(id, dto, actor) {
        return this.accountingService.updateSettlement(actor, id, dto);
    }
    reverseSettlement(id, dto, actor) {
        return this.accountingService.reverseSettlement(actor, id, dto);
    }
    verificationQueue(actor) {
        return this.accountingService.verificationQueue(actor);
    }
    verifyTourMoney(assignmentId, dto, actor) {
        return this.accountingService.verifyTourMoney(actor, assignmentId, dto);
    }
    rejectTourMoney(assignmentId, dto, actor) {
        return this.accountingService.rejectMoney(assignmentId, dto, actor);
    }
    people(query, actor) {
        return this.accountingService.people(actor, query);
    }
    periodPreview(query, actor) {
        return this.accountingService.periodPreview(actor, query);
    }
    exportPeriod(dto, actor) {
        return this.accountingService.exportPeriod(actor, dto);
    }
    watermarkOverview(actor) {
        return this.accountingService.watermarkOverview(actor);
    }
    voidPeriod(id, dto, user) {
        return this.accountingService.voidPeriod(user, id, dto);
    }
    periodHistory(personId, actor) {
        return this.accountingService.periodHistory(actor, personId);
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accounting_dto_1.CreateSettlementCategoryDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('assignments/:assignmentId/settlements'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "listSettlements", null);
__decorate([
    (0, common_1.Post)('assignments/:assignmentId/settlements'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.CreateSettlementDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createSettlement", null);
__decorate([
    (0, common_1.Put)('settlements/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.UpdateSettlementDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateSettlement", null);
__decorate([
    (0, common_1.Post)('settlements/:id/reverse'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "reverseSettlement", null);
__decorate([
    (0, common_1.Get)('verification-queue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "verificationQueue", null);
__decorate([
    (0, common_1.Post)('assignments/:assignmentId/verify-money'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.VerifyTourMoneyDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "verifyTourMoney", null);
__decorate([
    (0, common_1.Post)('assignments/:assignmentId/reject-money'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.RejectMoneyDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "rejectTourMoney", null);
__decorate([
    (0, common_1.Get)('people'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accounting_dto_1.ListPeopleQueryDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "people", null);
__decorate([
    (0, common_1.Get)('period/preview'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accounting_dto_1.PeriodQueryDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "periodPreview", null);
__decorate([
    (0, common_1.Post)('period/export'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accounting_dto_1.ExportPeriodDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "exportPeriod", null);
__decorate([
    (0, common_1.Get)('period/watermarks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "watermarkOverview", null);
__decorate([
    (0, common_1.Post)('period/:id/void'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, accounting_dto_1.VoidPeriodDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "voidPeriod", null);
__decorate([
    (0, common_1.Get)('period/history'),
    __param(0, (0, common_1.Query)('personId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "periodHistory", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)('accounting'),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map