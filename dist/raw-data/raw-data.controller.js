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
exports.RawDataController = void 0;
const common_1 = require("@nestjs/common");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const raw_data_service_1 = require("./raw-data.service");
const raw_data_entity_1 = require("./raw-data.entity");
let RawDataController = class RawDataController {
    prisma;
    service;
    constructor(prisma, service) {
        this.prisma = prisma;
        this.service = service;
    }
    async list(status, templateTag, page = '1', limit = '20') {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const validStatuses = Object.values(raw_data_entity_1.RAW_DATA_STATUS);
        const where = {};
        if (status && validStatuses.includes(status))
            where.status = status;
        if (templateTag)
            where.templateTag = templateTag;
        const [total, items] = await Promise.all([
            this.prisma.rawData.count({ where }),
            this.prisma.rawData.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
        ]);
        return { total, page: pageNum, limit: limitNum, items };
    }
    summary() {
        return this.service.summary();
    }
};
exports.RawDataController = RawDataController;
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('templateTag')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RawDataController.prototype, "list", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('gmail.manage'),
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RawDataController.prototype, "summary", null);
exports.RawDataController = RawDataController = __decorate([
    (0, common_1.Controller)('raw-data'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        raw_data_service_1.RawDataService])
], RawDataController);
//# sourceMappingURL=raw-data.controller.js.map