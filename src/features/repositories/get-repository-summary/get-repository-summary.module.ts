import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { GetRepositorySummaryController } from './get-repository-summary.controller';
import { GetRepositorySummaryService } from './get-repository-summary.service';
import { FindRepositoryService } from '../find-repository/find-repository.service';

@Module({
  controllers: [GetRepositorySummaryController],
  providers: [GetRepositorySummaryService, GithubRepository, FindRepositoryService],
  exports: [GetRepositorySummaryService, GithubRepository, FindRepositoryService],
})
export class GetRepositorySummaryModule {}
