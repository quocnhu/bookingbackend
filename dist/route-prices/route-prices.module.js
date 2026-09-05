"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePricesModule = void 0;
const common_1 = require("@nestjs/common");
const route_prices_controller_1 = require("./route-prices.controller");
const route_prices_service_1 = require("./route-prices.service");
const audit_module_1 = require("../audit/audit.module");
let RoutePricesModule = class RoutePricesModule {
};
exports.RoutePricesModule = RoutePricesModule;
exports.RoutePricesModule = RoutePricesModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [route_prices_controller_1.RoutePricesController],
        providers: [route_prices_service_1.RoutePricesService],
        exports: [route_prices_service_1.RoutePricesService],
    })
], RoutePricesModule);
//# sourceMappingURL=route-prices.module.js.map