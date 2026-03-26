// apps/worker/src/reviews/reviews.repository.ts
import { Injectable } from '@nestjs/common';
import { ReviewStatus } from 'src/domain/review-status.enum';
import { Review } from 'src/domain/review.entity';
import { ReviewResult } from 'src/features/llm/review-provider.interface';
import { PrReviewJobData } from 'src/shared/pre-review-job-data';
import { DataSource, Repository } from 'typeorm';
import { GithubRepository } from './repositories.repository';
import { PullRequestRepository } from './pull-request.repository';
import { ReviewIssueRepository } from './review-issue.repository';

@Injectable()
export class ReviewsRepository extends Repository<Review> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly githubRepository: GithubRepository,
    private readonly pullRequestRepository: PullRequestRepository,
    private readonly reviewIssueRepository: ReviewIssueRepository
  ) {
    super(Review, dataSource.createEntityManager());
  }

  /**
   * Called before processing starts.
   * Finds or creates the PullRequest record, then creates a Review in PROCESSING state.
   */
  async createPending(data: PrReviewJobData): Promise<Review> {
    return this.dataSource.transaction(async (manager) => {
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
        });
      } else {
        // Update with latest commit SHA on re-push
        await this.pullRequestRepository.update(pr.id, {
          head_commit_sha: data.headCommitSha,
          title: data.prTitle,
        });
      }

      // 3. Create the Review record in PROCESSING state
      const review = await this.save({
        pull_request_id: pr.id,
        head_commit_sha: data.headCommitSha,
        status: ReviewStatus.PROCESSING,
        processing_started_at: new Date(),
      });

      return review;
    });
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
      await this.update({id: reviewId}, {
        status: ReviewStatus.COMPLETED,
        score: result.score,
        summary: result.summary,
        missing_tests: result.missing_tests,
        breaking_change: result.breaking_change,
        llm_provider: provider,
        llm_model: model,
        github_review_id: githubReviewId ?? null,
        processing_completed_at: new Date(),
      });

      // Bulk insert all issues
      if (result.issues.length > 0) {
        const issues = result.issues.map((issue) =>
           this.reviewIssueRepository.create({
            id: reviewId,
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
    await this.update({id: reviewId}, {
      status: ReviewStatus.FAILED,
      processing_completed_at: new Date(),
    });
  }

  async markNoContent(reviewId: string): Promise<void> {
    await this.update({id: reviewId}, {
      status: ReviewStatus.NO_CONTENT,
      score: 100, 
      summary: 'No reviewable files found in this PR.',
      processing_completed_at: new Date(),
    });
  }

  async findDetailById(reviewId: string): Promise<Review | null> {
    return this.findOne({
      where: { id: reviewId },
      relations: ['issues', 'pullRequest'],
    });
  }
}
