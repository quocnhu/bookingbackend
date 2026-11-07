"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const transport_requests_controller_1 = require("./transport-requests.controller");
const transport_requests_service_1 = require("./transport-requests.service");
const audit_module_1 = require("../audit/audit.module");
const leaves_module_1 = require("../leaves/leaves.module");
let TransportRequestsModule = class TransportRequestsModule {
};
exports.TransportRequestsModule = TransportRequestsModule;
exports.TransportRequestsModule = TransportRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, leaves_module_1.LeavesModule],
        controllers: [transport_requests_controller_1.TransportRequestsController],
        providers: [transport_requests_service_1.TransportRequestsService],
        exports: [transport_requests_service_1.TransportRequestsService],
    })
], TransportRequestsModule);
//# sourceMappingURL=transport-requests.module.js.map