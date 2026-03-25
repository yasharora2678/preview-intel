import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { ConfigService } from '@nestjs/config';
import { CommitStatus } from './status.enum';
import { RedisService } from '../redis/redis.service';
import { AiReview, PrFile } from './github-types';
import * as fs from 'fs';

@Injectable()
export class GithubClientService {
  private readonly logger = new Logger(GithubClientService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  private async buildOctokit(token: string): Promise<Octokit> {
    return new Octokit({ auth: token });
  }

  private getPrivateKey(): string {
    const keyPath = this.configService.get<string>('GITHUB_APP_PRIVATE_KEY');

    return fs.readFileSync(keyPath, 'utf8');
  }

  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    const cacheKey = `github_installation_token:${installationId}`;
    const cachedToken = await this.redisService.get(cacheKey);

    if (cachedToken) {
      this.logger.log(`Using cached GitHub token for ${installationId}`);
      return this.buildOctokit(cachedToken);
    }

    this.logger.log(`Generating new GitHub token for ${installationId}`);

    const auth = createAppAuth({
      appId: this.configService.get<string>('GITHUB_APP_ID'),
      privateKey: this.getPrivateKey(),
      installationId,
    });

    const installationAuth = await auth({ type: 'installation' });
    const token = installationAuth.token;

    await this.redisService.set(cacheKey, token, 55 * 60);
    return this.buildOctokit(token);
  }

  async fetchPrFiles(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PrFile[]> {
    const response = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return response.map((file) => ({
      filename: file.filename,
      patch: file.patch,
      status: file.status,
    }));
  }

  filterFiles(files: PrFile[]): PrFile[] {
    const ignoredPatterns = [
      'package-lock.json',
      'yarn.lock',
      '.min.js',
      '.generated.',
      'migration',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
    ];

    return files.filter((file) => {
      if (!file.patch) return false;
      const name = file.filename.toLowerCase();
      if (ignoredPatterns.some((p) => name.includes(p))) return false;
      if (file.patch.length > 20000) return false;
      return true;
    });
  }

  async postPrReview(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
    review: AiReview,
  ) {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body: review.summary,
      event: 'COMMENT',
      comments: review.comments.map((comment) => ({
        path: comment.path,
        position: comment.position,
        body: comment.body,
      })),
    });

    this.logger.log(`Posted PR review for ${owner}/${repo}#${prNumber}`);
  }

  async createCommitStatus(
    octokit: Octokit,
    owner: string,
    repo: string,
    sha: string,
    state: CommitStatus,
    description: string,
  ) {
    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      description,
      context: 'AI Code Review',
    });

    this.logger.log(`Commit status set: ${state}`);
  }
}
