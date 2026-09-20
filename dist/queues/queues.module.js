"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const audit_module_1 = require("@/audit/audit.module");
const assignment_board_service_1 = require("./assignment-board.service");
const assignment_queue_1 = require("./assignment.queue");
const assignment_processor_1 = require("./assignment.processor");
const queue_constants_1 = require("./queue.constants");
const parsing_queue_1 = require("@/parsing/parsing.queue");
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            audit_module_1.AuditModule,
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        url: config.get('REDIS_URL', 'redis://localhost:6379'),
                    },
                    defaultJobOptions: {
                        removeOnComplete: true,
                        removeOnFail: 5000,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 2000 },
                    },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: queue_constants_1.BOOKING_MANUAL_QUEUE }, { name: parsing_queue_1.PARSE_QUEUE }, { name: queue_constants_1.ASSIGN_QUEUE }),
        ],
        providers: [assignment_board_service_1.AssignmentBoardService, assignment_queue_1.AssignmentQueue, assignment_processor_1.AssignmentProcessor],
        exports: [bullmq_1.BullModule, assignment_board_service_1.AssignmentBoardService, assignment_queue_1.AssignmentQueue],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map