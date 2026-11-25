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
exports.GuideHoldsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const guide_holds_service_1 = require("./guide-holds.service");
const guide_hold_dto_1 = require("./dto/guide-hold.dto");
let GuideHoldsController = class GuideHoldsController {
    service;
    constructor(service) {
        this.service = service;
    }
    mine(actor) {
        return this.service.mine(actor);
    }
    list(query) {
        return this.service.list(query);
    }
    create(dto, actor) {
        return this.service.create(dto, actor);
    }
    update(id, dto, actor) {
        return this.service.update(id, dto, actor);
    }
    release(id, actor) {
        return this.service.release(id, actor);
    }
};
exports.GuideHoldsController = GuideHoldsController;
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuideHoldsController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.RoleType.ADMIN, client_1.RoleType.OFFICE),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guide_hold_dto_1.QueryGuideHoldDto]),
    __metadata("design:returntype", void 0)
], GuideHoldsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.RoleType.ADMIN, client_1.RoleType.OFFICE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guide_hold_dto_1.CreateGuideHoldDto, Object]),
    __metadata("design:returntype", void 0)
], GuideHoldsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.RoleType.ADMIN, client_1.RoleType.OFFICE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, guide_hold_dto_1.UpdateGuideHoldDto, Object]),
    __metadata("design:returntype", void 0)
], GuideHoldsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    (0, roles_decorator_1.Roles)(client_1.RoleType.ADMIN, client_1.RoleType.OFFICE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GuideHoldsController.prototype, "release", null);
exports.GuideHoldsController = GuideHoldsController = __decorate([
    (0, common_1.Controller)('guide-holds'),
    __metadata("design:paramtypes", [guide_holds_service_1.GuideHoldsService])
], GuideHoldsController);
//# sourceMappingURL=guide-holds.controller.js.map