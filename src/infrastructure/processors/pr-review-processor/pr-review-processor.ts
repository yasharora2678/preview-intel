import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CircuitBreakerService } from 'src/infrastructure/llm/circuit-breaker.service';
import { LlmProviderFactory } from 'src/infrastructure/llm/llm-provider.factory';
import { ReviewResult } from 'src/domain/review/review-provider.interface';
import { ReviewsService } from 'src/features/reviews/reviews.service';
import { GithubClientService } from 'src/infrastructure/github/github-client.service';
import { GithubCommentService } from 'src/infrastructure/github/github-comment.service';
import { PrReviewJobData } from 'src/shared/pr-review-job-data';
import { Transactional } from 'typeorm-transactional';

@Processor('pr-review', {
  concurrency: 5,
})
export class PrReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(PrReviewProcessor.name);

  constructor(
    private readonly gitHubClientService: GithubClientService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly reviewService: ReviewsService,
    private readonly commentService: GithubCommentService,
    private readonly providerFactory: LlmProviderFactory,
  ) {
    super();
  }

  @Transactional()
  async process(job: Job<PrReviewJobData>): Promise<void> {
    const { data } = job;
    this.logger.log(
      { jobId: job.id, pr: data.prNumber },
      '🔄 Processing PR review job',
    );

    // 1. Create review record with 'processing' status
    const review = await this.reviewService.createPending(data);

    // 2. Post 'pending' status check on GitHub
    await this.commentService.postStatusCheck(data, 'pending');

    try {
      // 3. Fetch and chunk the diff
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

      // 4. Get the configured LLM provider for this installation
      const provider = await this.providerFactory.getForInstallation(
        data.installationId,
      );

    //   // 5. Call LLM (with circuit breaker) — merge chunks if multiple
      const results = await Promise.all(
        diffChunks.map((chunk) => this.circuitBreaker.review(provider, chunk)),
      );

      const mergedResult = this.mergeResults(results);

      // 6. Save review and issues to DB
      await this.reviewService.saveCompleted(
        review.id,
        mergedResult,
        provider.getName(),
        provider.getModel(),
        1,
      );

      // 7. Post review comment on GitHub PR
      const [owner2, repo2] = data.repoFullName.split('/');
      const githubReviewId = await this.commentService.postReview(
        data,
        mergedResult,
        owner2,
        repo2,
      );

      if (githubReviewId) {
        await this.reviewService.updateGithubReviewId(
          review.id,
          githubReviewId,
        );
      }

      // 8. Update commit status check
      const statusState =
        mergedResult.score >= 70
          ? 'success'
          : mergedResult.score >= 50
            ? 'pending' // neutral
            : 'failure';
      await this.commentService.postStatusCheck(
        data,
        statusState,
        mergedResult.score,
      );

      this.logger.log(
        { pr: data.prNumber, score: mergedResult.score },
        '✅ PR review completed',
      );
    } catch (err) {
        await this.reviewService.markFailed(
          review.id,
          (err as Error).message,
        );
       await this.commentService.postStatusCheck(data, 'error');
       throw err; // re-throw so BullMQ retries the job
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
