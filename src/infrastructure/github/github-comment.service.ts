import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import {
  ReviewIssue,
  ReviewResult,
} from 'src/domain/review/review-provider.interface';
import { PrReviewJobData } from 'src/shared/pr-review-job-data';
import { OCTOKIT_APP } from './github-app.module';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_POST_ATTEMPTS = 3;

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

    const inlineIssues = result.issues.filter(
      (issue) => issue.line !== null && issue.file,
    );
    const generalIssues = result.issues.filter(
      (issue) => issue.line === null || !issue.file,
    );

    const body = this.buildReviewBody(result, generalIssues);

    // Build inline comments for each issue that has a line number
    const comments = inlineIssues.map((issue) => ({
      path: issue.file,
      line: issue.line!,
      body: this.buildIssueComment(issue),
    }));

    for (let attempt = 1; attempt <= MAX_POST_ATTEMPTS; attempt++) {
      try {
        const response = await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: data.prNumber,
          commit_id: data.headCommitSha,
          body,
          event: 'COMMENT', // NEVER REQUEST_CHANGES or APPROVE — advisory only
          // Drop inline comments after the first failed attempt — GitHub rejects them
          // when line numbers are outdated (e.g. commit was amended after diff was fetched)
          comments: attempt === 1 && comments.length > 0 ? comments : undefined,
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
        const status: number | undefined = err.status ?? err.response?.status;
        const isTransient = status && RETRYABLE_STATUS_CODES.has(status);
        const isLastAttempt = attempt === MAX_POST_ATTEMPTS;

        if (isLastAttempt) {
          this.logger.error(
            { err: err.message, attempt },
            'All review post attempts failed',
          );
          throw err;
        }

        if (isTransient) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          this.logger.warn(
            { status, attempt, delayMs },
            'Transient GitHub error — retrying',
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Non-transient (e.g. 422 invalid line number) — retry without inline comments
          // but don't wait (it's not a rate limit issue)
          this.logger.warn(
            { status, attempt, err: err.message },
            'Non-transient error — retrying without inline comments',
          );
        }
      }
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
      failure:
        score >= 50
          ? `Review complete — Score: ${score}/100 ⚠️ (needs improvement)`
          : `Review complete — Score: ${score}/100 ❌ (below threshold)`,
      error: 'Review failed — will retry automatically',
    };

    // I14: build the dashboard URL — links directly to this review's detail page
    // data.reviewId isn't on PrReviewJobData yet, so link to the repo's reviews page
    const dashboardUrl =
      this.config.get<string>('DASHBOARD_URL') || 'http://localhost:3002';
    const targetUrl = `${dashboardUrl}/repositories/${data.repositoryId}/reviews`;

    try {
      await octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: data.headCommitSha,
        state,
        description: descriptions[state],
        context: 'PR Intelligence Review',
        target_url: targetUrl,
      });
    } catch (err: any) {
      // Status check failures are non-critical — log and continue
      this.logger.warn(
        { err: err.message },
        'Failed to post commit status check',
      );
    }
  }

  private buildReviewBody(
    result: ReviewResult,
    generalIssues: ReviewIssue[] = [],
  ): string {
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

    if (generalIssues.length > 0) {
      lines.push('### 📋 General Observations');
      lines.push('*These apply to the file overall, not a specific line.*');
      lines.push('');

      for (const issue of generalIssues) {
        const severityEmoji =
          { critical: '🔴', warning: '🟡', suggestion: '💡' }[issue.severity] ??
          '💡';
        const fileLabel = issue.file ? `\`${issue.file}\`` : 'General';

        lines.push(
          `**${severityEmoji} [${issue.type.toUpperCase()}] ${fileLabel}**`,
        );
        lines.push(issue.description);
        lines.push(`> 💡 ${issue.suggestion}`);
        lines.push('');
      }
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
