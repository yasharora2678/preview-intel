import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/domain/user.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { FindRepositoryService } from '../find-repository/find-repository.service';
import { PaginationDto } from 'src/infrastructure/dto/pagination.dto';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';

@Injectable()
export class GetPullRequestsService {
  private readonly logger = new Logger(GetPullRequestsService.name);

  constructor(
    private readonly findRepository: FindRepositoryService,
    @InjectRepository(PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
  ) {}

  public async handle(repoId: string, user: User, pagination: PaginationDto) {
    await this.findRepository.handle(repoId, user); // authorization check

    const [items, total] = await this.pullRequestRepository.findAndCount({
      where: { repository_id: repoId },
      order: { created_at: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
      relations: ['reviews'], // so frontend can show latest review status per PR
    });

    return { items, total, page: pagination.page, limit: pagination.limit };
  }
}
