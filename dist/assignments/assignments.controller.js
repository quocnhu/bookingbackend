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
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
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
    setBoardOrigin(dto) {
        return this.assignmentsService.setBoardOrigin(dto.origin);
    }
    dispatchAllBoard() {
        return this.assignmentsService.dispatchAllBoard();
    }
    getBoardCrew() {
        return this.assignmentsService.getBoardCrew();
    }
    getCrewAvailability(from, to) {
        return this.assignmentsService.getCrewAvailability(new Date(from ?? Date.now()), new Date(to ?? Date.now()));
    }
    findMyAssignments(actor) {
        return this.assignmentsService.findMyAssignments(actor);
    }
    findMyCalendar(actor, year, month) {
        return this.assignmentsService.findMyCalendar(actor, year ? +year : undefined, month ? +month : undefined);
    }
    findMyPayments(actor, startDate, endDate) {
        return this.assignmentsService.findMyPayments(actor, startDate, endDate);
    }
    settlementSummary(dto) {
        return this.assignmentsService.settlementSummary(dto.from, dto.to, dto.guideId, dto.driverId);
    }
    findOne(id) {
        return this.assignmentsService.findOne(id);
    }
    create(dto, actor) {
        return this.assignmentsService.create(dto, actor);
    }
    update(id, dto) {
        return this.assignmentsService.update(id, dto);
    }
    updateStatus(id, dto) {
        return this.assignmentsService.updateStatus(id, dto);
    }
    reorderBookings(id, dto) {
        return this.assignmentsService.reorderBookings(id, dto.bookingIds);
    }
    moveBooking(id, bookingId, dto) {
        return this.assignmentsService.moveBooking(id, bookingId, dto.toAssignmentId);
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
    submitTourReport(id, dto, actor) {
        return this.assignmentsService.submitTourReport(id, dto, actor);
    }
    uploadTourReportImage(id, file, actor) {
        return this.assignmentsService.uploadReportImage(id, file, actor);
    }
    verifyTourReport(id, dto, actor) {
        return this.assignmentsService.verifyTourReport(id, dto, actor);
    }
    finalize(id, dto, actor) {
        return this.assignmentsService.finalize(id, dto, actor);
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
    (0, common_1.Put)('board/origin'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assignment_dto_1.SetBoardOriginDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "setBoardOrigin", null);
__decorate([
    (0, common_1.Post)('board/dispatch-all'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "dispatchAllBoard", null);
__decorate([
    (0, common_1.Get)('board/crew'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "getBoardCrew", null);
__decorate([
    (0, common_1.Get)('board/crew/availability'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "getCrewAvailability", null);
__decorate([
    (0, common_1.Get)('my-assignments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findMyAssignments", null);
__decorate([
    (0, common_1.Get)('my-calendar'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findMyCalendar", null);
__decorate([
    (0, common_1.Get)('my-payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "findMyPayments", null);
__decorate([
    (0, common_1.Get)('settlement-summary'),
    (0, permissions_decorator_1.Permissions)('assignment.read'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assignment_dto_1.SettlementSummaryDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "settlementSummary", null);
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
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assignment_dto_1.CreateAssignmentDto, Object]),
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
    (0, common_1.Post)(':id/bookings/reorder'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.ReorderBookingsDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "reorderBookings", null);
__decorate([
    (0, common_1.Put)(':id/bookings/:bookingId/move'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('bookingId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, assignment_dto_1.MoveBookingDto]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "moveBooking", null);
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
__decorate([
    (0, common_1.Post)(':id/tour-report'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.SubmitTourReportDto, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "submitTourReport", null);
__decorate([
    (0, common_1.Post)(':id/tour-report/images'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 20 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "uploadTourReportImage", null);
__decorate([
    (0, common_1.Put)(':id/tour-report/verify'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.VerifyTourReportDto, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "verifyTourReport", null);
__decorate([
    (0, common_1.Put)(':id/finalize'),
    (0, permissions_decorator_1.Permissions)('assignment.update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assignment_dto_1.FinalizeAssignmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "finalize", null);
exports.AssignmentsController = AssignmentsController = __decorate([
    (0, common_1.Controller)('assignments'),
    __metadata("design:paramtypes", [assignments_service_1.AssignmentsService])
], AssignmentsController);
//# sourceMappingURL=assignments.controller.js.map