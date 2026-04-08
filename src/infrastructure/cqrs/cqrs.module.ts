import { Module } from '@nestjs/common';
import { CqrsModule as NestCqrsModule } from '@nestjs/cqrs';

// Command Handlers
import { CreateReviewHandler } from './handlers/commands/create-review.handler';
import { UpdateReviewStatusHandler } from './handlers/commands/update-review-status.handler';
import { SaveReviewIssuesHandler } from './handlers/commands/save-review-issue.handler';

// Query Handlers
import { GetRepositoryReviewsHandler } from './handlers/queries/get-repository-reviews.handler';
import { GetReviewDetailHandler } from './handlers/queries/get-review-detail.handler';
import { ReviewsRepository } from '../repositories/review-repository';
import { ReviewIssueRepository } from '../repositories/review-issue.repository';
import { GetScoreTrendHandler } from './handlers/queries/get-score-trend.handler';
import { GetIssueDistributionHandler } from './handlers/queries/get-issue-distribution.handler';
import { GetAuthorStatisticsHandler } from './handlers/queries/get-author-statistics.handler';

const CommandHandlers = [
  CreateReviewHandler,
  UpdateReviewStatusHandler,
  SaveReviewIssuesHandler,
];

const QueryHandlers = [
  GetRepositoryReviewsHandler,
  GetReviewDetailHandler,
  GetScoreTrendHandler,
  GetIssueDistributionHandler,
  GetAuthorStatisticsHandler,
];

@Module({
  imports: [NestCqrsModule],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ReviewsRepository,
    ReviewIssueRepository,
  ],
  exports: [NestCqrsModule],
})
export class AppCqrsModule {}
