import { Module } from '@nestjs/common';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { GetScoreTrendController } from './get-score-trend.controller';
import { GetScoreTrendService } from './get-score-trend.service';
import { AppCqrsModule } from 'src/infrastructure/cqrs/cqrs.module';
import { FindRepositoryModule } from '../find-repository/find-repository.module';

@Module({
  imports: [AppCqrsModule, FindRepositoryModule],
  controllers: [GetScoreTrendController],
  providers: [GetScoreTrendService, GithubRepository],
  exports: [GetScoreTrendService, GithubRepository],
})
export class GetScoreTrendModule {}
