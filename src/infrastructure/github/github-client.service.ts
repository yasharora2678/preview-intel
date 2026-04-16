import { Inject, Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { DiffInput } from 'src/domain/review/review-provider.interface';
import { OCTOKIT_APP } from './github-app.module';

const SKIP_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /\.generated\.(ts|js)$/,
  /migrations?\//,
  /\.(png|jpg|gif|ico|svg|woff|woff2)$/,
];

const MAX_TOKENS_PER_CHUNK = 3000;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CHARS_PER_CHUNK = MAX_TOKENS_PER_CHUNK * APPROX_CHARS_PER_TOKEN;

@Injectable()
export class GithubClientService {
  private readonly logger = new Logger(GithubClientService.name);

  constructor(
    @Inject(OCTOKIT_APP) private readonly githubApp,
  ) {}

  private async getInstallationOctokit(
    installationId: number,
  ): Promise<Octokit> {
    return this.githubApp.getInstallationOctokit(
      installationId,
    ) as unknown as Octokit;
  }

  private shouldSkipFile(filename: string): boolean {
    return SKIP_PATTERNS.some((pattern) => pattern.test(filename));
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'TypeScript',
      js: 'JavaScript',
      py: 'Python',
      go: 'Go',
      rs: 'Rust',
      java: 'Java',
      cs: 'C#',
      rb: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
    };
    return langMap[ext || ''] || 'Unknown';
  }

  async fetchPrDiff(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<DiffInput[]> {
    const octokit = await this.getInstallationOctokit(installationId);

    const [prData, filesData] = await Promise.all([
      octokit.rest.pulls.get({ owner, repo, pull_number: prNumber }),
      octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
    ]);

    const pr = prData.data;
    const files = filesData.data
      .filter((f) => !this.shouldSkipFile(f.filename))
      .filter((f) => f.patch) // some files have no patch (binary, too large)
      .map((f) => ({
        filename: f.filename,
        language: this.detectLanguage(f.filename),
        patch: f.patch!,
      }));

    this.logger.log(
      {
        prNumber,
        totalFiles: filesData.data.length,
        reviewableFiles: files.length,
      },
      'Fetched PR diff',
    );

    return this.chunkFiles(files, {
      prTitle: pr.title,
      prDescription: pr.body || undefined,
    });
  }

  private chunkFiles(
    files: DiffInput['files'],
    meta: { prTitle: string; prDescription?: string },
  ): DiffInput[] {
    const chunks: DiffInput[] = [];
    let currentChunk: DiffInput['files'] = [];
    let currentSize = 0;

    for (const file of files) {
      const fileSize = file.patch.length;

      if (
        currentSize + fileSize > MAX_CHARS_PER_CHUNK &&
        currentChunk.length > 0
      ) {
        chunks.push({ ...meta, files: currentChunk });
        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(file);
      currentSize += fileSize;
    }

    if (currentChunk.length > 0) {
      chunks.push({ ...meta, files: currentChunk });
    }

    return chunks.length > 0 ? chunks : [{ ...meta, files: [] }];
  }
}
