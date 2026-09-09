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
var AssignmentQueue_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentQueue = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_constants_1 = require("./queue.constants");
let AssignmentQueue = AssignmentQueue_1 = class AssignmentQueue {
    queue;
    logger = new common_1.Logger(AssignmentQueue_1.name);
    constructor(queue) {
        this.queue = queue;
    }
    async enqueue(bookingId) {
        try {
            await this.queue.add(queue_constants_1.ASSIGN_JOB, { bookingId }, {
                jobId: `assign-${bookingId}`,
                removeOnComplete: true,
                removeOnFail: 5000,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
            });
            return { enqueued: true, bookingId };
        }
        catch (e) {
            const err = e;
            if (err?.name === 'JobNotUniqueError' ||
                /duplicate|already exists/i.test(err?.message ?? '')) {
                return { enqueued: false, bookingId, reason: 'ALREADY_QUEUED' };
            }
            this.logger.warn(`Enqueue assign ${bookingId} failed: ${err?.message}`);
            return { enqueued: false, bookingId, reason: err?.message };
        }
    }
};
exports.AssignmentQueue = AssignmentQueue;
exports.AssignmentQueue = AssignmentQueue = AssignmentQueue_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_constants_1.ASSIGN_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], AssignmentQueue);
//# sourceMappingURL=assignment.queue.js.map