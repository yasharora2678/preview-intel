import { Module } from '@nestjs/common';
import { GetIssueDistributionController } from './get-issue-distribution.controller';
import { FindRepositoryService } from '../find-repository/find-repository.service';
import { GetIssueDistributionService } from './get-issue-distribution.service';
import { AppCqrsModule } from 'src/infrastructure/cqrs/cqrs.module';
import { FindRepositoryModule } from '../find-repository/find-repository.module';

@Module({
  imports: [AppCqrsModule, FindRepositoryModule],
  controllers: [GetIssueDistributionController],
  providers: [GetIssueDistributionService],
  exports: [GetIssueDistributionService],
})
export class GetIssueDistributionModule {}
