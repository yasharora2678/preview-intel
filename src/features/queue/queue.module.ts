import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrReviewProcessor } from 'src/infrastructure/processors/pr-review-processor/pr-review-processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL'),
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: 'pr-review',
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: false,
        },
      },
      // {
      //   name: 'pr-review-dlq',
      //   defaultJobOptions: {
      //     removeOnComplete: false,
      //     removeOnFail: false,
      //   },
      // },
    ),
  ],
  providers: [PrReviewProcessor],
  exports: [BullModule],
})
export class QueueModule {}
