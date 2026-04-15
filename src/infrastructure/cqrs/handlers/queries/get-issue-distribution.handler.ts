import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetIssueDistributionQuery } from '../../queries/get-issue-distribution.query';
import { ReviewIssueRepository } from 'src/infrastructure/repositories/review-issue.repository';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InjectRepository } from '@nestjs/typeorm';

@QueryHandler(GetIssueDistributionQuery)
export class GetIssueDistributionHandler implements IQueryHandler<GetIssueDistributionQuery> {
  constructor(
    @InjectRepository(ReviewIssueRepository)
    private readonly reviewIssueRepository: ReviewIssueRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetIssueDistributionQuery) {
    const cacheKey = this.cacheService.keys.issueDistribution(query.repositoryId);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.reviewIssueRepository
      .createQueryBuilder('ri')
      .innerJoin('ri.review', 'review')
      .innerJoin('review.pullRequest', 'pr')
      .select('ri.type', 'type')
      .addSelect('ri.severity', 'severity')
      .addSelect('COUNT(ri.id)', 'count')
      .where('pr.repository_id = :repoId', { repoId: query.repositoryId })
      .andWhere('review.status = :status', { status: 'completed' })
      .groupBy('ri.type')
      .addGroupBy('ri.severity')
      .orderBy('count', 'DESC')
      .getRawMany();

    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }
}