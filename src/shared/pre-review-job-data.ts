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
  action: 'opened' | 'synchronize' | 'reopened';
}

export enum JobPriority {
  HIGH = 1,    // review_requested
  NORMAL = 5,  // opened, reopened
  LOW = 10,    // synchronize (re-push)
}