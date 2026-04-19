export interface PrReviewJobData {
  installationId: number;
  repositoryId: string;
  githubRepoId: number;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  headCommitSha: string;
  baseBranch: string;
  headBranch: string;
  authorLogin: string;
  githubPrUrl: string;
  action: 'opened' | 'synchronize' | 'reopened';
  traceId: string;
}

export enum JobPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}
