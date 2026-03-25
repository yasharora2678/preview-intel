import { z } from 'zod';

export const IssueSchema = z.object({
  type: z.enum(['bug', 'security', 'style', 'performance', 'test']),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  file: z.string().min(1),
  line: z.number().int().nonnegative(),
  description: z.string().min(1),
  suggestion: z.string().min(1),
});

export const ReviewResultSchema = z.object({
  summary: z.string().min(1),
  score: z.number().int().min(0).max(100),
  issues: z.array(IssueSchema),
  positives: z.array(z.string()),
  missing_tests: z.boolean(),
  breaking_change: z.boolean(),
});

export const DiffInputSchema = z.object({
  filename: z.string().min(1),
  language: z.string().min(1),
  content: z.string(),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;
export type DiffInput    = z.infer<typeof DiffInputSchema>;
export type Issue        = z.infer<typeof IssueSchema>;