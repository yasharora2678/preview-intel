import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { WebhooksModule } from './features/webhooks/webhooks.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule'
import { OutboxPollerModule } from './infrastructure/outbox-poller/outbox-poller.module';
import { QueueModule } from './features/queue/queue.module';
import { GithubModule } from './infrastructure/github/github-module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    WebhooksModule,
    OutboxPollerModule,
    QueueModule,
    GithubModule,
    // RedisModule,
    BullModule.forRoot({
      connection: {
        host: 'ai-pr-reviewer-redis',
        port: 6379,
      },
    }),
    RedisModule.forRoot({             
      type: 'single',
      url: 'redis://ai-pr-reviewer-redis:6379',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
