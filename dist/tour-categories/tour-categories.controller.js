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
exports.TourCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const tour_categories_service_1 = require("./tour-categories.service");
const tour_category_dto_1 = require("./dto/tour-category.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let TourCategoriesController = class TourCategoriesController {
    tourCategoriesService;
    constructor(tourCategoriesService) {
        this.tourCategoriesService = tourCategoriesService;
    }
    findAll() {
        return this.tourCategoriesService.findAll();
    }
    findAllAdmin() {
        return this.tourCategoriesService.findAll(true);
    }
    create(dto) {
        return this.tourCategoriesService.create(dto);
    }
    update(id, dto) {
        return this.tourCategoriesService.update(id, dto);
    }
    remove(id) {
        return this.tourCategoriesService.remove(id);
    }
};
exports.TourCategoriesController = TourCategoriesController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TourCategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, permissions_decorator_1.Permissions)('tour.update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TourCategoriesController.prototype, "findAllAdmin", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('tour.create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [tour_category_dto_1.CreateTourCategoryDto]),
    __metadata("design:returntype", void 0)
], TourCategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('tour.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tour_category_dto_1.UpdateTourCategoryDto]),
    __metadata("design:returntype", void 0)
], TourCategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('tour.delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TourCategoriesController.prototype, "remove", null);
exports.TourCategoriesController = TourCategoriesController = __decorate([
    (0, common_1.Controller)('tour-categories'),
    __metadata("design:paramtypes", [tour_categories_service_1.TourCategoriesService])
], TourCategoriesController);
//# sourceMappingURL=tour-categories.controller.js.map