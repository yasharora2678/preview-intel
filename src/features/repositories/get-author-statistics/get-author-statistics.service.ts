import { Injectable, Logger } from '@nestjs/common';
import { User } from 'src/domain/user.entity';
import { FindRepositoryService } from '../find-repository/find-repository.service';
import { QueryBus } from '@nestjs/cqrs';
import { GetAuthorStatisticsQuery } from 'src/infrastructure/cqrs/queries/get-author-statistics.query';

@Injectable()
export class GetAuthorStatisticsService {
  private readonly logger = new Logger(GetAuthorStatisticsService.name);

  constructor(
    private readonly findRepository: FindRepositoryService,
    private readonly queryBus: QueryBus,
  ) {}

  public async handle(repoId: string, user: User) {
    await this.findRepository.handle(repoId, user);
    return this.queryBus.execute(new GetAuthorStatisticsQuery(repoId));
  }
}
