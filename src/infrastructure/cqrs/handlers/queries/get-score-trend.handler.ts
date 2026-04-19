import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetScoreTrendQuery } from '../../queries/get-score-trend-query';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InjectRepository } from '@nestjs/typeorm';

@QueryHandler(GetScoreTrendQuery)
export class GetScoreTrendHandler implements IQueryHandler<GetScoreTrendQuery> {
  constructor(
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetScoreTrendQuery) {
    const cacheKey = this.cacheService.keys.scoreTrend(
      query.repositoryId,
      query.period,
    );
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const intervalMap: Record<string, string> = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      all: null,
    };
    const interval = intervalMap[query.period];

    const qb = this.reviewsRepository
      .createQueryBuilder('review')
      .innerJoin('review.pullRequest', 'pr')
      .select("DATE_TRUNC('day', review.created_at)", 'date')
      .addSelect('ROUND(AVG(review.score)::numeric, 1)', 'avgScore')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('pr.repository_id = :repoId', { repoId: query.repositoryId })
      .andWhere('review.status = :status', { status: 'completed' })
      .groupBy("DATE_TRUNC('day', review.created_at)")
      .orderBy('date', 'ASC');

    if (interval) {
      qb.andWhere(`review.created_at >= NOW() - INTERVAL '${interval}'`);
    }

    const result = await qb.getRawMany();
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
}
