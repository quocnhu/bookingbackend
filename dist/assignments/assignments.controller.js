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
exports.AssignmentsController = void 0;
const common_1 = require("@nestjs/common");
const assignments_service_1 = require("./assignments.service");
const assignment_dto_1 = require("./dto/assignment.dto");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AssignmentsController = class AssignmentsController {
    assignmentsService;
    constructor(assignmentsService) {
        this.assignmentsService = assignmentsService;
    }
    findAll(query, actor) {
        return this.assignmentsService.findAll(query, actor);
    }
    findBoard(actor) {
        return this.assignmentsService.findBoard(actor);
    }
    findOne(id) {
        return this.assignmentsService.findOne(id);
    }
    create(dto) {
        return this.assignmentsService.create(dto);
    }
    update(id, dto) {
        return this.assignmentsService.update(id, dto);
    }
    updateStatus(id, dto) {
        return this.assignmentsService.updateStatus(id, dto);
    }
    assignBookings(id, dto) {
        return this.assignmentsService.assignBookings(id, dto);
    }
    removeBooking(id, bookingId) {
        return this.assignmentsService.removeBooking(id, bookingId);
    }
    remove(id) {
        return this.assignmentsService.remove(id);
    }
};
exports.AssignmentsController = AssignmentsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assignment_dto_1.QueryAssignmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('board'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findBoard", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('assignment.create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assignment_dto_1.CreateAssignmentDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.UpdateAssignmentDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.UpdateAssignmentStatusDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/bookings'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.AssignBookingsDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "assignBookings", null);
__decorate([
    (0, common_1.Delete)(':id/bookings/:bookingId'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "removeBooking", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('assignment.delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "remove", null);
exports.AssignmentsController = AssignmentsController = __decorate([
    (0, common_1.Controller)('assignments'),
    __metadata("design:paramtypes", [assignments_service_1.AssignmentsService])
], AssignmentsController);
//# sourceMappingURL=assignments.controller.js.map