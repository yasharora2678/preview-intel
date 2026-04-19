import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/domain/user.entity';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { FindRepositoryService } from '../find-repository/find-repository.service';

@Injectable()
export class GetRepositorySummaryService {
  private readonly logger = new Logger(GetRepositorySummaryService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
    private readonly cacheService: CacheService,
    private readonly findRepository: FindRepositoryService,
  ) {}

  public async handle(repoId: string, user: User) {
    await this.findRepository.handle(repoId, user);

    const cacheKey = this.cacheService.keys.repoSummary(repoId);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.githubRepository
      .createQueryBuilder('repo')
      .select('repo.id', 'id')
      .addSelect('repo.full_name', 'fullName')
      .addSelect('COUNT(DISTINCT pr.id)', 'totalPrs')
      .addSelect('AVG(r.score)', 'avgScore')
      .addSelect('MAX(r.created_at)', 'lastReviewDate')
      .innerJoin('pull_requests', 'pr', 'pr.repository_id = repo.id')
      .innerJoin(
        'reviews',
        'r',
        'r.pull_request_id = pr.id AND r.status = :status',
        { status: 'completed' },
      )
      .where('repo.id = :repoId', { repoId })
      .groupBy('repo.id')
      .addGroupBy('repo.full_name')
      .getRawOne();

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
}
