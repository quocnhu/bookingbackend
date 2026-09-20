"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const raw_data_module_1 = require("@/raw-data/raw-data.module");
const queues_module_1 = require("@/queues/queues.module");
const parsing_module_1 = require("@/parsing/parsing.module");
const redis_provider_1 = require("./redis.provider");
const gmail_auth_provider_1 = require("./gmail-auth.provider");
const gmail_watch_service_1 = require("./gmail-watch.service");
const gmail_pubsub_service_1 = require("./gmail-pubsub.service");
const gmail_connect_service_1 = require("./gmail-connect.service");
const google_oidc_service_1 = require("./google-oidc.service");
const gmail_controller_1 = require("./gmail.controller");
let IngestionModule = class IngestionModule {
};
exports.IngestionModule = IngestionModule;
exports.IngestionModule = IngestionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            raw_data_module_1.RawDataModule,
            queues_module_1.QueuesModule,
            parsing_module_1.ParsingModule,
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [gmail_controller_1.GmailController],
        providers: [
            redis_provider_1.redisProvider,
            gmail_auth_provider_1.GmailAuthService,
            gmail_watch_service_1.GmailWatchService,
            gmail_pubsub_service_1.GmailPubSubService,
            gmail_connect_service_1.GmailConnectService,
            google_oidc_service_1.GoogleOidcService,
        ],
        exports: [gmail_auth_provider_1.GmailAuthService, gmail_watch_service_1.GmailWatchService, gmail_pubsub_service_1.GmailPubSubService],
    })
], IngestionModule);
//# sourceMappingURL=ingestion.module.js.map