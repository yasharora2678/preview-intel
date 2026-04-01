import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ReviewStatus } from 'src/domain/review/review-status.enum';
import { User } from 'src/domain/user.entity';
import { Review } from 'src/domain/review/review.entity';
import { GetRepositoryReviewsQuery } from 'src/infrastructure/cqrs/queries/get-repository-reviews.query';
import { GetReviewDetailQuery } from 'src/infrastructure/cqrs/queries/get-review-detail.query';
import { PaginationDto } from 'src/infrastructure/dto/pagination.dto';
import { PullRequestRepository } from 'src/infrastructure/repositories/pull-request.repository';
import { GithubRepository } from 'src/infrastructure/repositories/repositories.repository';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { PrReviewJobData } from 'src/shared/pr-review-job-data';
import { ReviewResult } from '../../domain/review/review-provider.interface';
import { ReviewIssueRepository } from 'src/infrastructure/repositories/review-issue.repository';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly queryBus: QueryBus,
    @InjectRepository(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    @InjectRepository(PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
    @InjectRepository(GithubRepository)
    private readonly githubRepository: GithubRepository,
    @InjectRepository(ReviewIssueRepository)
    private readonly reviewIssueRepository: ReviewIssueRepository,
    // private readonly queueService: QueueService,
  ) {}

  async getRepositoryReviews(
    repoId: string,
    user: User,
    pagination: PaginationDto,
    filters?: any,
  ) {
    await this.verifyRepoAccess(repoId, user);

    return this.queryBus.execute(
      new GetRepositoryReviewsQuery(
        repoId,
        user.id,
        pagination.page,
        pagination.limit,
        filters,
      ),
    );
  }

  async getReviewDetail(reviewId: string, user: User) {
    const review = await this.queryBus.execute(
      new GetReviewDetailQuery(reviewId, user.id),
    );

    // Verify user has access to this review's repo
    await this.verifyRepoAccess(review.pullRequest.repository.id, user);

    return review;
  }

  /**
   * Trigger a fresh re-review for a PR (manual trigger from dashboard)
   */
  async triggerRereview(
    reviewId: string,
    user: User,
  ): Promise<{ jobId: string }> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      relations: [
        'pullRequest',
        'pullRequest.repository',
        'pullRequest.repository.installation',
      ],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const repo = review.pullRequest.repository;
    await this.verifyRepoAccess(repo.id, user);

    const pr = review.pullRequest;

    this.logger.log({
      msg: 'Manual re-review triggered',
      reviewId,
      prNumber: pr.github_pr_number,
      triggeredBy: user.github_username,
    });

    // await this.queueService.enqueueReview({
    //   outboxEventId: `rereview-${reviewId}`,
    //   eventType: 'pull_request.rereview',
    //   prNumber: pr.github_pr_number,
    //   prTitle: pr.title,
    //   prUrl: pr.github_pr_url,
    //   headSha: pr.head_commit_sha,
    //   baseBranch: pr.base_branch,
    //   headBranch: pr.head_branch,
    //   authorLogin: pr.author_login,
    //   repoFullName: repo.full_name,
    //   repoGithubId: repo.github_repo_id,
    //   githubInstallationId: repo.installation.github_installation_id,
    // });

    return { jobId: `rereview-${reviewId}` };
  }

  async getPullRequestReviews(prId: string, user: User) {
    const pr = await this.pullRequestRepository.findOne({
      where: { id: prId },
      relations: ['repository'],
    });

    if (!pr) throw new NotFoundException('Pull request not found');
    await this.verifyRepoAccess(pr.repository_id, user);

    return this.reviewsRepository.find({
      where: { pull_request_id: prId },
      relations: ['issues'],
      order: { created_at: 'DESC' },
    });
  }

  private async verifyRepoAccess(repoId: string, user: User): Promise<void> {
    // if (user.isAdmin) return;

    const repo = await this.githubRepository.findOne({
      where: { id: repoId },
      relations: ['installation'],
    });

    if (!repo) throw new NotFoundException('Repository not found');

    if (repo.installation.user_id !== user.id) {
      throw new ForbiddenException('You do not have access to this repository');
    }
  }

  async createPending(data: PrReviewJobData): Promise<Review> {
    // 1. Find the repository record by GitHub repo ID
    const repo = await this.githubRepository.findOne({
      where: { github_repo_id: data.githubRepoId },
    });

    if (!repo) {
      throw new Error(
        `Repository not found for githubRepoId: ${data.githubRepoId}`,
      );
    }

    // 2. Upsert the PullRequest record
    let pr = await this.pullRequestRepository.findOne({
      where: {
        repository_id: repo.id,
        github_pr_number: data.prNumber,
      },
    });

    if (!pr) {
      pr = await this.pullRequestRepository.save({
        repository_id: repo.id,
        github_pr_number: data.prNumber,
        title: data.prTitle,
        author_login: data.authorLogin,
        head_commit_sha: data.headCommitSha,
        base_branch: data.baseBranch,
        head_branch: data.headBranch,
        state: 'open',
        github_pr_url: data.githubPrUrl,
      });
    } else {
      // Update with latest commit SHA on re-push
      await this.pullRequestRepository.update(pr.id, {
        head_commit_sha: data.headCommitSha,
        title: data.prTitle,
      });
    }

    // 3. Create the Review record in PROCESSING state
    const review = await this.reviewsRepository.save({
      pull_request_id: pr.id,
      head_commit_sha: data.headCommitSha,
      status: ReviewStatus.PROCESSING,
      processing_started_at: new Date(),
    });

    return review;
  }

  /**
   * Called after LLM returns a result. Saves score, summary, and all issues.
   */
  async saveCompleted(
    reviewId: string,
    result: ReviewResult,
    provider: string,
    model: string,
    githubReviewId?: number,
  ): Promise<void> {
    // Update the review record
    await this.reviewsRepository.update(
      { id: reviewId },
      {
        status: ReviewStatus.COMPLETED,
        score: result.score,
        summary: result.summary,
        missing_tests: result.missing_tests,
        breaking_change: result.breaking_change,
        llm_provider: provider,
        llm_model: model,
        github_review_id: githubReviewId ?? null,
        processing_completed_at: new Date(),
      },
    );

    // Bulk insert all issues
    if (result.issues.length > 0) {
      const issues = result.issues.map((issue) =>
        this.reviewIssueRepository.create({
          review_id: reviewId,
          type: issue.type,
          severity: issue.severity,
          file_path: issue.file,
          line_number: issue.line ?? null,
          description: issue.description,
          suggestion: issue.suggestion,
        }),
      );

      await this.reviewIssueRepository.save(issues);
    }
  }

  async markFailed(reviewId: string, errorMessage: string): Promise<void> {
    await this.reviewsRepository.update(
      { id: reviewId },
      {
        status: ReviewStatus.FAILED,
        processing_completed_at: new Date(),
      },
    );
  }

  async markNoContent(reviewId: string): Promise<void> {
    await this.reviewsRepository.update(
      { id: reviewId },
      {
        status: ReviewStatus.NO_CONTENT,
        score: 100,
        summary: 'No reviewable files found in this PR.',
        processing_completed_at: new Date(),
      },
    );
  }

  async findDetailById(reviewId: string): Promise<Review | null> {
    return this.reviewsRepository.findOne({
      where: { id: reviewId },
      relations: ['issues', 'pullRequest'],
    });
  }

  async updateGithubReviewId(
    reviewId: string,
    githubReviewId: number,
  ): Promise<void> {
    await this.reviewsRepository.update({ id: reviewId }, { github_review_id: githubReviewId });
  }
}
