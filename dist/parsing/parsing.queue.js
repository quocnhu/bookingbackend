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
exports.ParsingQueue = exports.PARSE_JOB = exports.PARSE_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
exports.PARSE_QUEUE = 'parse';
exports.PARSE_JOB = 'parse-raw-data';
let ParsingQueue = class ParsingQueue {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async enqueue(rawDataId) {
        await this.queue.add(exports.PARSE_JOB, { rawDataId }, {
            jobId: `parse-${rawDataId}`,
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
        });
        return { enqueued: true, rawDataId };
    }
};
exports.ParsingQueue = ParsingQueue;
exports.ParsingQueue = ParsingQueue = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(exports.PARSE_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], ParsingQueue);
//# sourceMappingURL=parsing.queue.js.map