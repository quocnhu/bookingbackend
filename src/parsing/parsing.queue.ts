import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const PARSE_QUEUE = 'parse';
export const PARSE_JOB = 'parse-raw-data';

export interface ParseJobData {
  rawDataId: string;
}

/**
 * Producer cho queue parse (Stage 2 — rawData → booking).
 * Job {rawDataId} được enqueue ngay sau khi ingestion insert rawData,
 * trước khi ack Pub/Sub + advance historyId checkpoint.
 */
@Injectable()
export class ParsingQueue {
  constructor(
    @InjectQueue(PARSE_QUEUE) private readonly queue: Queue<ParseJobData>,
  ) {}

  async enqueue(rawDataId: string) {
    await this.queue.add(
      PARSE_JOB,
      { rawDataId },
      {
        jobId: `parse-${rawDataId}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    return { enqueued: true, rawDataId };
  }
}
