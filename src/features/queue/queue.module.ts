import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrReviewProcessor } from 'src/infrastructure/processors/pr-review-processor/pr-review-processor';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'pr-review',
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          // removeOnComplete: true,
          // removeOnFail: false
        },
      },
      {
        name: 'pr-review-dead',
      },
    ),
  ],
  providers: [PrReviewProcessor],
  exports: [BullModule],
})
export class QueueModule {}
