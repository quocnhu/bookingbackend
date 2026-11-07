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
exports.DriveController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const drive_service_1 = require("./drive.service");
const drive_dto_1 = require("./dto/drive.dto");
const MAX_FILE_SIZE = 512 * 1024 * 1024;
let DriveController = class DriveController {
    driveService;
    constructor(driveService) {
        this.driveService = driveService;
    }
    driveUserId(actor, requested) {
        if (actor.role === client_1.RoleType.ADMIN)
            return requested || actor.id;
        if (requested && requested !== actor.id) {
            throw new common_1.ForbiddenException('You can only access your own Drive');
        }
        return actor.id;
    }
    root(user, userId) {
        return this.driveService.listContents(this.driveUserId(user, userId));
    }
    listUsers() {
        return this.driveService.listDriveUsers();
    }
    ensureDate(user, date) {
        return this.driveService.getOrCreateTourGuideDateFolder(user.id, date);
    }
    ensureDatePost(user, date) {
        return this.driveService.getOrCreateTourGuideDateFolder(user.id, date);
    }
    folder(id, user, userId) {
        return this.driveService.listContents(this.driveUserId(user, userId), id);
    }
    createFolder(dto, user, userId) {
        return this.driveService.createFolder(this.driveUserId(user, userId), dto);
    }
    renameFolder(id, dto, user, userId) {
        return this.driveService.renameFolder(this.driveUserId(user, userId), id, dto);
    }
    deleteFolder(id, user, userId) {
        return this.driveService.deleteFolder(this.driveUserId(user, userId), id);
    }
    uploadAvatar(file, targetUserId, user) {
        return this.driveService.uploadAvatar(user, file, targetUserId);
    }
    upload(file, folderId, name, date, useDateFolder, tourName, user, userId) {
        const useDate = useDateFolder === 'true' || useDateFolder === '1' || undefined;
        return this.driveService.uploadFile(this.driveUserId(user, userId), file, folderId || undefined, name, { date, useDateFolder: !!useDate, tourName: tourName || undefined });
    }
    renameFile(id, dto, user, userId) {
        return this.driveService.renameFile(this.driveUserId(user, userId), id, dto);
    }
    deleteFile(id, user, userId) {
        return this.driveService.deleteFile(this.driveUserId(user, userId), id);
    }
};
exports.DriveController = DriveController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, roles_decorator_1.Roles)(client_1.RoleType.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('ensure-date'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "ensureDate", null);
__decorate([
    (0, common_1.Post)('ensure-date'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "ensureDatePost", null);
__decorate([
    (0, common_1.Get)('folders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "folder", null);
__decorate([
    (0, common_1.Post)('folders'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [drive_dto_1.CreateFolderDto, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Patch)('folders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, drive_dto_1.RenameFolderDto, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "renameFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "deleteFolder", null);
__decorate([
    (0, common_1.Post)('avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: MAX_FILE_SIZE },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('userId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Post)('files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: MAX_FILE_SIZE },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('folderId')),
    __param(2, (0, common_1.Body)('name')),
    __param(3, (0, common_1.Body)('date')),
    __param(4, (0, common_1.Body)('useDateFolder')),
    __param(5, (0, common_1.Body)('tourName')),
    __param(6, (0, current_user_decorator_1.CurrentUser)()),
    __param(7, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "upload", null);
__decorate([
    (0, common_1.Patch)('files/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, drive_dto_1.RenameFileDto, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "renameFile", null);
__decorate([
    (0, common_1.Delete)('files/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "deleteFile", null);
exports.DriveController = DriveController = __decorate([
    (0, common_1.Controller)('drive'),
    __metadata("design:paramtypes", [drive_service_1.DriveService])
], DriveController);
//# sourceMappingURL=drive.controller.js.map