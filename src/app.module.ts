import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { WebhooksModule } from './features/webhooks/webhooks.module';
import { ScheduleModule } from '@nestjs/schedule'
import { OutboxPollerModule } from './infrastructure/outbox-poller/outbox-poller.module';
import { QueueModule } from './features/queue/queue.module';
import { GithubModule } from './infrastructure/github/github-module';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    WebhooksModule,
    OutboxPollerModule,
    QueueModule,
    GithubModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
