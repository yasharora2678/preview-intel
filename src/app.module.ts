import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { WebhooksModule } from './features/webhooks/webhooks.module';
import { ScheduleModule } from '@nestjs/schedule'
import { OutboxPollerModule } from './infrastructure/outbox-poller/outbox-poller.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { LoggerModule } from 'nestjs-pino';
import { CacheModule } from './infrastructure/cache/cache.module';
import { AppCqrsModule } from './infrastructure/cqrs/cqrs.module';
import { AuthModule } from './features/auth/auth.module';
import { ReviewModule } from './features/reviews/reviews.module';
import { GithubAppModule } from './infrastructure/github/github-app.module';
import { ProcessorModule } from './infrastructure/processors/pr-review-processor/pr-review-processor.module';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './features/health/health.module';
import { RepositoryModule } from './features/repositories/repository.module';
import { InstallationModule } from './features/installations/installation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SharedModule,
    DatabaseModule,
    WebhooksModule,
    OutboxPollerModule,
    QueueModule,
    GithubAppModule,
    CacheModule,
    AppCqrsModule,
    AuthModule,
    ReviewModule,
    ProcessorModule,
    RepositoryModule,
    HealthModule,
    InstallationModule,
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
