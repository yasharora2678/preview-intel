import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';
import { ReviewIssueRepository } from 'src/infrastructure/repositories/review-issue.repository';
import { AppCqrsModule } from 'src/infrastructure/cqrs/cqrs.module';
import { QueueModule } from 'src/infrastructure/queue/queue.module';

@Module({
  imports: [
    AppCqrsModule,
    QueueModule
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    GithubRepository,
    InstallationRepository,
    ReviewsRepository,
    PullRequestRepository,
    ReviewIssueRepository,
  ],
  exports: [
    ReviewsService,
    GithubRepository,
    InstallationRepository,
    ReviewsRepository,
    PullRequestRepository,
    ReviewIssueRepository,
  ],
})
export class ReviewModule {}
