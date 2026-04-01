import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { ReviewResult } from 'src/domain/review/review-provider.interface';
import { PrReviewJobData } from 'src/shared/pr-review-job-data';
import { OCTOKIT_APP } from './github-app.module';

@Injectable()
export class GithubCommentService {
  private readonly logger = new Logger(GithubCommentService.name);

  constructor(
    @Inject(OCTOKIT_APP) private readonly githubApp,
    private readonly config: ConfigService,
  ) {}

  private async getOctokit(installationId: number): Promise<Octokit> {
    return this.githubApp.getInstallationOctokit(
      installationId,
    ) as unknown as Octokit;
  }

  /**
   * Posts the full review as a GitHub PR Review with inline comments.
   * Returns the GitHub review ID for storage.
   */
  async postReview(
    data: PrReviewJobData,
    result: ReviewResult,
    owner: string,
    repo: string,
  ): Promise<number> {
    const octokit = await this.getOctokit(data.installationId);

    // Build the top-level review body
    const body = this.buildReviewBody(result);

    // Build inline comments for each issue that has a line number
    const comments = result.issues
      .filter((issue) => issue.line !== null && issue.file)
      .map((issue) => ({
        path: issue.file,
        line: issue.line!,
        body: this.buildIssueComment(issue),
      }));

    try {
      const response = await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: data.prNumber,
        commit_id: data.headCommitSha,
        body,
        event: 'COMMENT', // NEVER REQUEST_CHANGES or APPROVE — advisory only
        comments: comments.length > 0 ? comments : undefined,
      });

      this.logger.log(
        {
          prNumber: data.prNumber,
          score: result.score,
          issues: result.issues.length,
        },
        '✅ Posted GitHub PR review',
      );

      return response.data.id;
    } catch (err: any) {
      // GitHub API sometimes rejects inline comments if line is outdated
      // Fallback: post without inline comments
      this.logger.warn(
        { err: err.message },
        'Failed to post with inline comments, retrying without them',
      );
      const fallback = await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: data.prNumber,
        commit_id: data.headCommitSha,
        body,
        event: 'COMMENT',
      });
      return fallback.data.id;
    }
  }

  /**
   * Posts a commit status check — shows as a check on the PR.
   */
  async postStatusCheck(
    data: PrReviewJobData,
    state: 'pending' | 'success' | 'failure' | 'error',
    score?: number,
  ): Promise<void> {
    const [owner, repo] = data.repoFullName.split('/');
    const octokit = await this.getOctokit(data.installationId);

    const descriptions: Record<string, string> = {
      pending: 'AI review in progress...',
      success: `Review complete — Score: ${score}/100 ✅`,
      failure: `Review complete — Score: ${score}/100 ❌ (below threshold)`,
      error: 'Review failed — will retry automatically',
    };

    try {
      await octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: data.headCommitSha,
        state,
        description: descriptions[state],
        context: 'PR Intelligence Review',
        // target_url: `${this.config.get('DASHBOARD_URL')}/reviews`, // link to dashboard
      });
    } catch (err: any) {
      // Status check failures are non-critical — log and continue
      this.logger.warn(
        { err: err.message },
        'Failed to post commit status check',
      );
    }
  }

  private buildReviewBody(result: ReviewResult): string {
    const scoreEmoji =
      result.score >= 70 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
    const criticalCount = result.issues.filter(
      (i) => i.severity === 'critical',
    ).length;
    const warningCount = result.issues.filter(
      (i) => i.severity === 'warning',
    ).length;

    const lines = [
      `## 🤖 AI PR Review — Score: ${result.score}/100 ${scoreEmoji}`,
      '',
      `### Summary`,
      result.summary,
      '',
    ];

    if (result.issues.length > 0) {
      lines.push(`### Issues Found (${result.issues.length} total)`);
      lines.push(`- 🔴 Critical: ${criticalCount}`);
      lines.push(`- 🟡 Warnings: ${warningCount}`);
      lines.push(
        `- 💡 Suggestions: ${result.issues.length - criticalCount - warningCount}`,
      );
      lines.push('');
    }

    if (result.positives.length > 0) {
      lines.push('### ✨ What was done well');
      result.positives.forEach((p) => lines.push(`- ${p}`));
      lines.push('');
    }

    const flags = [];
    if (result.missing_tests) flags.push('⚠️ Missing tests detected');
    if (result.breaking_change)
      flags.push('🚨 Potential breaking change detected');
    if (flags.length > 0) {
      lines.push('### Flags');
      flags.forEach((f) => lines.push(f));
    }

    return lines.join('\n');
  }

  private buildIssueComment(issue: any): string {
    const severityEmoji =
      {
        critical: '🔴',
        warning: '🟡',
        suggestion: '💡',
      }[issue.severity] || '💡';

    return [
      `${severityEmoji} **[${issue.severity.toUpperCase()}] ${issue.type}**`,
      '',
      issue.description,
      '',
      `**Suggestion:** ${issue.suggestion}`,
    ].join('\n');
  }
}
