import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GithubModule } from 'src/infrastructure/github/github-module';
import { PrReviewProcessor } from 'src/infrastructure/processors/pr-review-processor/pr-review-processor';
import { LlmModule } from '../llm/llm.module';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';
import { ReviewIssueRepository } from 'src/infrastructure/repositories/review-issue.repository';

@Module({
  imports: [
    GithubModule,
    LlmModule,
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
  ],
  providers: [
    PrReviewProcessor,
    ReviewsRepository,
    GithubRepository,
    PullRequestRepository,
    ReviewIssueRepository,
  ],
  exports: [BullModule],
})
export class QueueModule {}
