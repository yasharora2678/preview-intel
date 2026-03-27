import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import {
  DiffInput,
  ReviewProvider,
  ReviewResult,
  ReviewResultSchema,
} from '../review-provider.interface';

// Same system prompt as OpenAI — consistency is important
const SYSTEM_PROMPT = `You are a senior software engineer conducting a pull request review.
Your job is to provide a thorough, constructive code review.

Focus on:
- Bugs and logic errors (most important)
- Security vulnerabilities  
- Performance issues
- Missing error handling
- Missing tests for critical paths
- Code style and maintainability

Be specific: reference the exact file and line number for each issue.
Be constructive: always provide a concrete suggestion.
Be fair: acknowledge what was done well.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON:
{
  "summary": "2-3 sentence overview",
  "score": <integer 0-100>,
  "issues": [{ 
    "type": "bug|security|style|performance|test", 
    "severity": "critical|warning|suggestion", 
    "file": "path/to/file", 
    "line": <number or null>, 
    "description": "what is wrong", 
    "suggestion": "how to fix it" 
  }],
  "positives": ["thing done well"],
  "missing_tests": <boolean>,
  "breaking_change": <boolean>
}`;

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
          `### File: ${f.filename} (${f.language})\n\`\`\`diff\n${f.patch}\n\`\`\``,
      )
      .join('\n\n');

    return `PR Title: ${diff.prTitle}
${diff.prDescription ? `PR Description: ${diff.prDescription}` : ''}

## Changed Files:
${filesSection}

Review the above pull request and respond with the JSON schema only.`;
  }

  async review(diff: DiffInput): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(diff);

    this.logger.log(
      {
        files: diff.files.length,
        estimatedTokens: this.estimateTokens(userPrompt),
      },
      'Calling Anthropic for review',
    );

    const message = await this.client.messages.create({
      model: this.MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text content from response
    const rawText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    if (!rawText) {
      throw new Error('Empty response from Anthropic');
    }

    // Strip any accidental markdown code fences Claude might add
    const cleanJson = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error(
        `Anthropic returned invalid JSON: ${cleanJson.substring(0, 200)}`,
      );
    }

    const result = ReviewResultSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(
        { errors: result.error.format() },
        'Anthropic response schema mismatch',
      );
      throw new Error('Anthropic response did not match expected schema');
    }

    return result.data;
  }
}
