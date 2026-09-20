"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportationProvidersModule = void 0;
const common_1 = require("@nestjs/common");
const transportation_providers_controller_1 = require("./transportation-providers.controller");
const transportation_providers_service_1 = require("./transportation-providers.service");
const audit_module_1 = require("@/audit/audit.module");
let TransportationProvidersModule = class TransportationProvidersModule {
};
exports.TransportationProvidersModule = TransportationProvidersModule;
exports.TransportationProvidersModule = TransportationProvidersModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [transportation_providers_controller_1.TransportationProvidersController],
        providers: [transportation_providers_service_1.TransportationProvidersService],
        exports: [transportation_providers_service_1.TransportationProvidersService],
    })
], TransportationProvidersModule);
//# sourceMappingURL=transportation-providers.module.js.map