import { Module } from '@nestjs/common';
import { FindRepositoryModule } from './find-repository/find-repository.module';
import { GetAuthorStatisticsModule } from './get-author-statistics/get-author-statistics.module';
import { GetIssueDistributionModule } from './get-issue-distribution/get-issue-distribution.module';
import { GetPullRequestsModule } from './get-pull-requests/get-pull-requests.module';
import { GetRepositoryModule } from './get-repository/get-repository.module';
import { GetRepositorySummaryModule } from './get-repository-summary/get-repository-summary.module';
import { GetScoreTrendModule } from './get-score-trend/get-score-trend.module';
import { UpdateRepositoryModule } from './update-repository/update-repository.module';
import { CreateRepositoryModule } from './create-repository/create-repository.module';

@Module({
  imports: [
    FindRepositoryModule,
    GetAuthorStatisticsModule,
    GetIssueDistributionModule,
    GetPullRequestsModule,
    GetRepositoryModule,
    GetRepositorySummaryModule,
    GetScoreTrendModule,
    UpdateRepositoryModule,
    CreateRepositoryModule
  ],
  controllers: [],
  providers: [],
})
export class RepositoryModule {}
