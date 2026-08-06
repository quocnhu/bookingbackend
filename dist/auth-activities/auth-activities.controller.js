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
exports.AuthActivitiesController = void 0;
const common_1 = require("@nestjs/common");
const auth_activities_service_1 = require("./auth-activities.service");
const query_auth_activity_dto_1 = require("./dto/query-auth-activity.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AuthActivitiesController = class AuthActivitiesController {
    authActivitiesService;
    constructor(authActivitiesService) {
        this.authActivitiesService = authActivitiesService;
    }
    findAll(query, actor) {
        return this.authActivitiesService.findAll(query, actor);
    }
};
exports.AuthActivitiesController = AuthActivitiesController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('auth.read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_auth_activity_dto_1.QueryAuthActivityDto, Object]),
    __metadata("design:returntype", void 0)
], AuthActivitiesController.prototype, "findAll", null);
exports.AuthActivitiesController = AuthActivitiesController = __decorate([
    (0, common_1.Controller)('auth-activities'),
    __metadata("design:paramtypes", [auth_activities_service_1.AuthActivitiesService])
], AuthActivitiesController);
//# sourceMappingURL=auth-activities.controller.js.map