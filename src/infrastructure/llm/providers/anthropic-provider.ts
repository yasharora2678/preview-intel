import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  DiffInput,
  ReviewProvider,
  ReviewResult,
  ReviewResultSchema,
} from '../../../domain/review/review-provider.interface';

const SYSTEM_PROMPT = `You are a senior software engineer conducting a pull request review.
Your job is to provide a thorough, constructive code review that helps the developer improve their code.

Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Missing error handling
- Missing tests
- Code maintainability

You MUST respond with ONLY a valid JSON object matching this exact schema:
{
  "summary": "2-3 sentence overview",
  "score": <integer 0-100>,
  "issues": [{
    "type": "bug|security|style|performance|test",
    "severity": "critical|warning|suggestion",
    "file": "REQUIRED - always use the exact filename from the changed files list above. Never null.",
    "line": <line number where the issue occurs, or null ONLY if the issue applies to the entire file and has no single location>,
    "description": "what is wrong",
    "suggestion": "how to fix it"
  }],
  "positives": ["thing done well"],
  "missing_tests": <boolean>,
  "breaking_change": <boolean>
}

STRICT RULES:
- "file" is ALWAYS required. Use the exact filename from the PR diff.
- Never use null for "file".
- "line" should be a specific line number whenever possible. Use null ONLY for file-level observations with no single location (e.g. "this file lacks error handling throughout"). For style issues, use the line of the first occurrence.
- Do not include any explanation outside the JSON object.`;

@Injectable()
export class AnthropicProvider implements ReviewProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;

  private readonly MODEL = 'claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  getName(): string {
    return 'anthropic';
  }

  getModel(): string {
    return this.MODEL;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private buildUserPrompt(diff: DiffInput): string {
    const filesSection = diff.files
      .map(
        (f) =>
          `### File: ${f.filename} (${f.language})
\`\`\`diff
${f.patch}
\`\`\``,
      )
      .join('\n\n');

    return `PR Title: ${diff.prTitle}
${diff.prDescription ? `PR Description: ${diff.prDescription}` : ''}

## Changed Files:
${filesSection}

Review the above pull request and respond with JSON only.`;
  }

  async review(diff: DiffInput): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(diff);
    const estimatedTokens = this.estimateTokens(userPrompt);

    this.logger.log(
      { estimatedTokens, files: diff.files.length },
      'Calling Anthropic model',
    );

    try {
      const response = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const block = response.content[0];

      if (!block || block.type !== 'text') {
        throw new Error('Unexpected non-text response from Anthropic');
      }

      let text = block.text.trim();

      // Remove markdown fences if model adds them
      text = text.replace(/```json\n?|\n?```/g, '').trim();

      let parsed: unknown;

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error();

        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error(
          `Anthropic returned invalid JSON: ${text.substring(0, 200)}`,
        );
      }

      const validated = ReviewResultSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.error(
          { errors: validated.error.format() },
          'Anthropic response schema mismatch',
        );

        throw new Error('Anthropic response did not match expected schema');
      }

      return validated.data;
    } catch (error: any) {
      this.logger.error(
        { error: error?.message, status: error?.status },
        '🔴 Anthropic API error',
      );

      /**
       * Rate limit handling
       */
      if (error?.status === 429) {
        const retryAfter =
          error?.headers?.['retry-after'] ||
          error?.response?.headers?.['retry-after'];

        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 + 500 : 5000;

        this.logger.warn(
          { waitMs },
          '⏳ Anthropic rate limited — waiting before retry',
        );

        await new Promise((resolve) => setTimeout(resolve, waitMs));

        throw new Error(`Anthropic rate limit — retry after ${waitMs}ms`);
      }

      /**
       * Auth error
       */
      if (error?.status === 401) {
        throw new Error('Invalid Anthropic API key.');
      }
      throw error;
    }
  }
}
