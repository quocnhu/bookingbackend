"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuideConfirmationModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const mail_module_1 = require("../mail/mail.module");
const guide_confirmation_controller_1 = require("./guide-confirmation.controller");
const guide_confirmation_service_1 = require("./guide-confirmation.service");
let GuideConfirmationModule = class GuideConfirmationModule {
};
exports.GuideConfirmationModule = GuideConfirmationModule;
exports.GuideConfirmationModule = GuideConfirmationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, mail_module_1.MailModule],
        controllers: [guide_confirmation_controller_1.GuideConfirmationController],
        providers: [guide_confirmation_service_1.GuideConfirmationService],
        exports: [guide_confirmation_service_1.GuideConfirmationService],
    })
], GuideConfirmationModule);
//# sourceMappingURL=guide-confirmation.module.js.map