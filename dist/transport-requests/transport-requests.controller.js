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
exports.TransportRequestsController = void 0;
const common_1 = require("@nestjs/common");
const transport_requests_service_1 = require("./transport-requests.service");
const transport_request_dto_1 = require("./dto/transport-request.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let TransportRequestsController = class TransportRequestsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query, actor) {
        return this.service.list(query, actor);
    }
    getSettings() {
        return this.service.getSettings();
    }
    updateSettings(dto, actor) {
        return this.service.updateSettings(dto, actor);
    }
    getProviderSettings(actor, providerId) {
        return this.service.getProviderSettings(actor, providerId);
    }
    updateProviderSettings(dto, actor) {
        return this.service.updateProviderSettings(dto, actor);
    }
    getDriverWorkload(actor, providerId) {
        return this.service.getDriverWorkload(actor, providerId);
    }
    getCandidates(assignmentId, actor) {
        return this.service.getCandidates(assignmentId, actor);
    }
    send(id, dto, actor) {
        return this.service.send(id, dto, actor);
    }
    cancel(id, dto, actor) {
        return this.service.cancel(id, dto, actor);
    }
    override(id, dto, actor) {
        return this.service.override(id, dto, actor);
    }
    markViewed(id, actor) {
        return this.service.markViewed(id, actor);
    }
    assign(id, dto, actor) {
        return this.service.assign(id, dto, actor);
    }
    autoAssign(id, actor) {
        return this.service.autoAssign(id, actor);
    }
    decline(id, dto, actor) {
        return this.service.decline(id, dto, actor);
    }
};
exports.TransportRequestsController = TransportRequestsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transport_request_dto_1.QueryTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transport_request_dto_1.UpdateTransportRequestSettingsDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('provider-settings'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "getProviderSettings", null);
__decorate([
    (0, common_1.Put)('provider-settings'),
    (0, permissions_decorator_1.Permissions)('assignment.create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transport_request_dto_1.UpdateProviderAssignmentModeDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "updateProviderSettings", null);
__decorate([
    (0, common_1.Get)('workload'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "getDriverWorkload", null);
__decorate([
    (0, common_1.Get)('candidates/:assignmentId'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "getCandidates", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transport_request_dto_1.SendTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transport_request_dto_1.CancelTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/override'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transport_request_dto_1.OverrideTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "override", null);
__decorate([
    (0, common_1.Post)(':id/view'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "markViewed", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    (0, permissions_decorator_1.Permissions)('assignment.create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transport_request_dto_1.AssignTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/auto-assign'),
    (0, permissions_decorator_1.Permissions)('assignment.create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "autoAssign", null);
__decorate([
    (0, common_1.Post)(':id/decline'),
    (0, permissions_decorator_1.Permissions)('assignment.create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, transport_request_dto_1.DeclineTransportRequestDto, Object]),
    __metadata("design:returntype", void 0)
], TransportRequestsController.prototype, "decline", null);
exports.TransportRequestsController = TransportRequestsController = __decorate([
    (0, common_1.Controller)('transport-requests'),
    __metadata("design:paramtypes", [transport_requests_service_1.TransportRequestsService])
], TransportRequestsController);
//# sourceMappingURL=transport-requests.controller.js.map