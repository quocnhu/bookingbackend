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
exports.RoutePricesController = void 0;
const common_1 = require("@nestjs/common");
const route_prices_service_1 = require("./route-prices.service");
const route_price_dto_1 = require("./dto/route-price.dto");
const permissions_decorator_1 = require("@/common/decorators/permissions.decorator");
const current_user_decorator_1 = require("@/common/decorators/current-user.decorator");
let RoutePricesController = class RoutePricesController {
    routePricesService;
    constructor(routePricesService) {
        this.routePricesService = routePricesService;
    }
    findAll(query, actor) {
        return this.routePricesService.findAll(query, actor);
    }
    getDropdownData(actor) {
        return this.routePricesService.getDropdownData(actor);
    }
    getAssignable(actor) {
        return this.routePricesService.getAssignable(actor);
    }
    findOne(id) {
        return this.routePricesService.findOne(id);
    }
    create(dto, actor) {
        return this.routePricesService.create(actor, dto);
    }
    update(id, dto, actor) {
        return this.routePricesService.update(actor, id, dto);
    }
    remove(id) {
        return this.routePricesService.remove(id);
    }
};
exports.RoutePricesController = RoutePricesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [route_price_dto_1.QueryRoutePriceDto, Object]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('dropdown'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "getDropdownData", null);
__decorate([
    (0, common_1.Get)('assignable'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "getAssignable", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('route-price.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [route_price_dto_1.CreateRoutePriceDto, Object]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('route-price.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, route_price_dto_1.UpdateRoutePriceDto, Object]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('route-price.delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoutePricesController.prototype, "remove", null);
exports.RoutePricesController = RoutePricesController = __decorate([
    (0, common_1.Controller)('route-prices'),
    __metadata("design:paramtypes", [route_prices_service_1.RoutePricesService])
], RoutePricesController);
//# sourceMappingURL=route-prices.controller.js.map