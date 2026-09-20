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
exports.TransportationProvidersController = void 0;
const common_1 = require("@nestjs/common");
const transportation_providers_service_1 = require("./transportation-providers.service");
const transportation_provider_dto_1 = require("./dto/transportation-provider.dto");
const permissions_decorator_1 = require("@/common/decorators/permissions.decorator");
const current_user_decorator_1 = require("@/common/decorators/current-user.decorator");
let TransportationProvidersController = class TransportationProvidersController {
    transportationProvidersService;
    constructor(transportationProvidersService) {
        this.transportationProvidersService = transportationProvidersService;
    }
    findAll(actor) {
        return this.transportationProvidersService.findAll(actor);
    }
    findAllDrivers(actor) {
        return this.transportationProvidersService.findAllDrivers(actor);
    }
    findOne(id, actor) {
        return this.transportationProvidersService.findOne(id, actor);
    }
    createDriver(dto, actor) {
        return this.transportationProvidersService.createDriver(actor, dto);
    }
    updateDriver(id, dto, actor) {
        return this.transportationProvidersService.updateDriver(actor, id, dto);
    }
    createVehicle(dto, actor) {
        return this.transportationProvidersService.createVehicle(actor, dto);
    }
    updateVehicle(id, dto, actor) {
        return this.transportationProvidersService.updateVehicle(actor, id, dto);
    }
    deleteVehicle(id, actor) {
        return this.transportationProvidersService.deleteVehicle(actor, id);
    }
    assignDriver(providerId, dto) {
        return this.transportationProvidersService.assignDriver(providerId, dto);
    }
    unassignDriver(providerId, userId) {
        return this.transportationProvidersService.unassignDriver(providerId, userId);
    }
};
exports.TransportationProvidersController = TransportationProvidersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('drivers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "findAllDrivers", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('drivers'),
    (0, permissions_decorator_1.Permissions)('driver.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transportation_provider_dto_1.CreateDriverDto, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "createDriver", null);
__decorate([
    (0, common_1.Put)('drivers/:id'),
    (0, permissions_decorator_1.Permissions)('driver.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transportation_provider_dto_1.UpdateDriverDto, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "updateDriver", null);
__decorate([
    (0, common_1.Post)('vehicles'),
    (0, permissions_decorator_1.Permissions)('vehicle.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transportation_provider_dto_1.CreateTransportationVehicleDto, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "createVehicle", null);
__decorate([
    (0, common_1.Put)('vehicles/:id'),
    (0, permissions_decorator_1.Permissions)('vehicle.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transportation_provider_dto_1.UpdateTransportationVehicleDto, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "updateVehicle", null);
__decorate([
    (0, common_1.Delete)('vehicles/:id'),
    (0, permissions_decorator_1.Permissions)('vehicle.delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "deleteVehicle", null);
__decorate([
    (0, common_1.Post)(':providerId/drivers'),
    (0, permissions_decorator_1.Permissions)('provider-driver.assign'),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transportation_provider_dto_1.AssignDriverToProviderDto]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "assignDriver", null);
__decorate([
    (0, common_1.Delete)(':providerId/drivers/:userId'),
    (0, permissions_decorator_1.Permissions)('provider-driver.unassign'),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TransportationProvidersController.prototype, "unassignDriver", null);
exports.TransportationProvidersController = TransportationProvidersController = __decorate([
    (0, common_1.Controller)('transportation-providers'),
    __metadata("design:paramtypes", [transportation_providers_service_1.TransportationProvidersService])
], TransportationProvidersController);
//# sourceMappingURL=transportation-providers.controller.js.map