import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'; 
import { DlqAlertService } from './dlq-alert-service';

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
    BullModule.registerQueue({
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
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    
    BullBoardModule.forFeature({
      name: 'pr-review',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    DlqAlertService
  ],
  exports: [BullModule],
})
export class QueueModule {}
