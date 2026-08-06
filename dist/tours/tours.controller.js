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
exports.ToursController = void 0;
const common_1 = require("@nestjs/common");
const tours_service_1 = require("./tours.service");
const tour_dto_1 = require("./dto/tour.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let ToursController = class ToursController {
    toursService;
    constructor(toursService) {
        this.toursService = toursService;
    }
    findAll(query) {
        return this.toursService.findAll(query);
    }
    findOne(id) {
        return this.toursService.findOne(id);
    }
    create(dto) {
        return this.toursService.create(dto);
    }
    update(id, dto) {
        return this.toursService.update(id, dto);
    }
    updateItinerary(id, dto, user) {
        return this.toursService.updateItinerary(id, dto, user.id);
    }
    remove(id, user) {
        return this.toursService.remove(id, user.id);
    }
};
exports.ToursController = ToursController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [tour_dto_1.QueryTourDto]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('tour.create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [tour_dto_1.CreateTourDto]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('tour.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tour_dto_1.UpdateTourDto]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/itinerary'),
    (0, permissions_decorator_1.Permissions)('tour.itinerary.edit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tour_dto_1.UpdateItineraryDto, Object]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "updateItinerary", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('tour.delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ToursController.prototype, "remove", null);
exports.ToursController = ToursController = __decorate([
    (0, common_1.Controller)('tours'),
    __metadata("design:paramtypes", [tours_service_1.ToursService])
], ToursController);
//# sourceMappingURL=tours.controller.js.map