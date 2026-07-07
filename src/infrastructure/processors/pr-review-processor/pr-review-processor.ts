import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job } from 'bullmq';
import {
  CircuitBreakerService,
  CircuitOpenError,
} from 'src/infrastructure/llm/circuit-breaker.service';
import { LlmProviderFactory } from 'src/infrastructure/llm/llm-provider.factory';
import { ReviewResult } from 'src/domain/review/review-provider.interface';
import { ReviewsService } from 'src/features/reviews/reviews.service';
import { GithubClientService } from 'src/infrastructure/github/github-client.service';
import { GithubCommentService } from 'src/infrastructure/github/github-comment.service';
import { PrReviewJobData } from 'src/shared/pr-review-job-data';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';

@Processor('pr-review', {
  concurrency: 5,
})
export class PrReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(PrReviewProcessor.name);

  constructor(
    private readonly gitHubClientService: GithubClientService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly reviewService: ReviewsService,
    private readonly repository: GithubRepository,
    private readonly commentService: GithubCommentService,
    private readonly providerFactory: LlmProviderFactory,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async process(job: Job<PrReviewJobData>, token?: string): Promise<void> {
    const { data } = job;
    this.logger.log(
      { jobId: job.id, pr: data.prNumber, traceId: data.traceId },
      '🔄 Processing PR review job',
    );

    const repository = await this.repository.findOne({
      where: { github_repo_id: data.githubRepoId },
    })
    const review = await this.reviewService.createPending(data);

    await this.commentService.postStatusCheck(data, 'pending');

    try {
      const [owner, repo] = data.repoFullName.split('/');
      const diffChunks = await this.gitHubClientService.fetchPrDiff(
        data.installationId,
        owner,
        repo,
        data.prNumber,
      );

      if (diffChunks[0].files.length === 0) {
        this.logger.warn({ pr: data.prNumber }, 'No reviewable files in PR');
        await this.reviewService.markNoContent(review.id);
        return;
      }

      await this.checkRateLimits(data);

      const provider = await this.providerFactory.getForInstallation(
        data.installationId,
      );

      const results = await Promise.all(
        diffChunks.map((chunk) => this.circuitBreaker.review(provider, chunk)),
      );

      const mergedResult = this.mergeResults(results);

      await this.reviewService.saveCompleted(
        review.id,
        mergedResult,
        provider.getName(),
        provider.getModel(),
        1,
      );

      const githubReviewId = await this.commentService.postReview(
        data,
        mergedResult,
        owner,
        repo,
        repository
      );

      if (githubReviewId) {
        await this.reviewService.updateGithubReviewId(
          review.id,
          githubReviewId,
        );
      }

      const statusState = mergedResult.score >= repository.score_success_threshold ? 'success' : 'failure';

      await this.commentService.postStatusCheck(
        data,
        statusState,
        mergedResult.score,
      );

      this.logger.log(
        { pr: data.prNumber, score: mergedResult.score, traceId: data.traceId },
        '✅ PR review completed',
      );
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        this.logger.warn(
          { pr: data.prNumber, provider: (err as CircuitOpenError).message },
          '🔴 Circuit open — moving job to delayed (5 min)',
        );
        await job.moveToDelayed(Date.now() + 5 * 60 * 1000, token);
        throw new DelayedError();
      }

      await this.reviewService.markFailed(review.id, (err as Error).message);
      await this.commentService.postStatusCheck(data, 'error');
      throw err;
    }
  }

  private mergeResults(results: ReviewResult[]): ReviewResult {
    if (results.length === 1) return results[0];
    return {
      summary: results.map((r) => r.summary).join(' '),
      score: Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / results.length,
      ),
      issues: results.flatMap((r) => r.issues),
      positives: [...new Set(results.flatMap((r) => r.positives))],
      missing_tests: results.some((r) => r.missing_tests),
      breaking_change: results.some((r) => r.breaking_change),
    };
  }

  private async checkRateLimits(data: PrReviewJobData): Promise<void> {
    const redis = (this.cacheService as any).redis;

    const instKey = `rate:installation:${data.installationId}:${Math.floor(Date.now() / 60_000)}`;
    const instCount = await redis.incr(instKey);
    if (instCount === 1) await redis.expire(instKey, 60);

    if (instCount > 5) {
      throw new Error(
        `Installation rate limit exceeded (${instCount}/5 per minute) — will retry`,
      );
    }

    const repoKey = `rate:repo:${data.repositoryId}:${Math.floor(Date.now() / 3_600_000)}`;
    const repoCount = await redis.incr(repoKey);
    if (repoCount === 1) await redis.expire(repoKey, 3600);

    if (repoCount > 20) {
      throw new Error(
        `Repository rate limit exceeded (${repoCount}/20 per hour) — will retry`,
      );
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      {
        jobId: job.id,
        pr: job.data.prNumber,
        err: err.message,
        stack: err.stack,
      },
      '❌ Job failed',
    );
  }
}
