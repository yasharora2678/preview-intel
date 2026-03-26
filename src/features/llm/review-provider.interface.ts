import { z } from 'zod';

export const ReviewIssueSchema = z.object({
  type: z.enum(['bug', 'security', 'style', 'performance', 'test']),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  file: z.string(),
  line: z.number().int().nullable(),
  description: z.string(),
  suggestion: z.string(),
});

export const ReviewResultSchema = z.object({
  summary: z.string(),
  score: z.number().int().min(0).max(100),
  issues: z.array(ReviewIssueSchema),
  positives: z.array(z.string()),
  missing_tests: z.boolean(),
  breaking_change: z.boolean(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

export interface DiffInput {
  prTitle: string;
  prDescription?: string;
  files: Array<{
    filename: string;
    language: string;
    patch: string; // the actual diff
  }>;
}

export interface ReviewProvider {
  review(diff: DiffInput): Promise<ReviewResult>;
  getName(): string;
  estimateTokens(text: string): number;
}