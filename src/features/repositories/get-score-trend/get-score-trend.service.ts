import { Injectable, Logger } from '@nestjs/common';
import { User } from 'src/domain/user.entity';
import { FindRepositoryService } from '../find-repository/find-repository.service';
import { QueryBus } from '@nestjs/cqrs';
import { GetScoreTrendQuery } from 'src/infrastructure/cqrs/queries/get-score-trend-query';

@Injectable()
export class GetScoreTrendService {
  private readonly logger = new Logger(GetScoreTrendService.name);

  constructor(
    private readonly findRepository: FindRepositoryService,
    private readonly queryBus: QueryBus,
  ) {}

  public async handle(
    repoId: string,
    user: User,
    period: '7d' | '30d' | '90d' | 'all',
  ) {
    await this.findRepository.handle(repoId, user);
    return this.queryBus.execute(new GetScoreTrendQuery(repoId, period));
  }
}
