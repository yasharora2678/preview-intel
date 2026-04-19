import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { GetPullRequestsController } from './get-pull-requests.controller';
import { GetPullRequestsService } from './get-pull-requests.service';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';
import { FindRepositoryModule } from '../find-repository/find-repository.module';

@Module({
  imports: [FindRepositoryModule],
  controllers: [GetPullRequestsController],
  providers: [GetPullRequestsService, GithubRepository, PullRequestRepository],
  exports: [GetPullRequestsService, GithubRepository, PullRequestRepository],
})
export class GetPullRequestsModule {}
