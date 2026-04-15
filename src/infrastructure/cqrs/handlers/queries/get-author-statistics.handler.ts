import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAuthorStatisticsQuery } from '../../queries/get-author-statistics.query';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InjectRepository } from '@nestjs/typeorm';

@QueryHandler(GetAuthorStatisticsQuery)
export class GetAuthorStatisticsHandler implements IQueryHandler<GetAuthorStatisticsQuery> {
  constructor(
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetAuthorStatisticsQuery) {
    const cacheKey = this.cacheService.keys.authorStats(query.repositoryId);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .innerJoin('review.pullRequest', 'pr')
      .select('pr.author_login', 'authorLogin')
      .addSelect('COUNT(DISTINCT review.id)', 'totalReviews')
      .addSelect('ROUND(AVG(review.score)::numeric, 1)', 'avgScore')
      .addSelect(
        `SUM(CASE WHEN EXISTS (
          SELECT 1 FROM review_issues ri
          WHERE ri.review_id = review.id AND ri.severity = 'critical'
        ) THEN 1 ELSE 0 END)`,
        'reviewsWithCritical',
      )
      .where('pr.repository_id = :repoId', { repoId: query.repositoryId })
      .andWhere('review.status = :status', { status: 'completed' })
      .groupBy('pr.author_login')
      .orderBy('"reviewsWithCritical"', 'DESC')
      .getRawMany();

    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }
}