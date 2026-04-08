import { Module } from '@nestjs/common';
import { GetAuthorStatisticsController } from './get-author-statistics.controller';
import { AppCqrsModule } from 'src/infrastructure/cqrs/cqrs.module';
import { GetAuthorStatisticsService } from './get-author-statistics.service';
import { FindRepositoryModule } from '../find-repository/find-repository.module';

@Module({
  imports: [AppCqrsModule, FindRepositoryModule],
  controllers: [GetAuthorStatisticsController],
  providers: [GetAuthorStatisticsService],
  exports: [GetAuthorStatisticsService],
})
export class GetAuthorStatisticsModule {}
