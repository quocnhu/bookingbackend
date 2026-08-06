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
exports.SettlementsController = void 0;
const common_1 = require("@nestjs/common");
const settlements_service_1 = require("./settlements.service");
const settlement_dto_1 = require("./dto/settlement.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let SettlementsController = class SettlementsController {
    settlementsService;
    constructor(settlementsService) {
        this.settlementsService = settlementsService;
    }
    findAll(query, actor) {
        return this.settlementsService.findAll(query, actor);
    }
    findOne(id) {
        return this.settlementsService.findOne(id);
    }
    create(dto) {
        return this.settlementsService.create(dto);
    }
    update(id, dto) {
        return this.settlementsService.update(id, dto);
    }
    updateStatus(id, body) {
        return this.settlementsService.updateStatus(id, body.status);
    }
    remove(id) {
        return this.settlementsService.remove(id);
    }
};
exports.SettlementsController = SettlementsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('settlement.read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settlement_dto_1.QuerySettlementDto, Object]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('settlement.read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('settlement.create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [settlement_dto_1.CreateSettlementDto]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('settlement.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, settlement_dto_1.UpdateSettlementDto]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, permissions_decorator_1.Permissions)('settlement.approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('settlement.delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SettlementsController.prototype, "remove", null);
exports.SettlementsController = SettlementsController = __decorate([
    (0, common_1.Controller)('settlements'),
    __metadata("design:paramtypes", [settlements_service_1.SettlementsService])
], SettlementsController);
//# sourceMappingURL=settlements.controller.js.map