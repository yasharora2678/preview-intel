// apps/worker/src/llm/providers/openai.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  DiffInput,
  ReviewProvider,
  ReviewResult,
  ReviewResultSchema,
} from '../review-provider.interface';

const SYSTEM_PROMPT = `You are a senior software engineer conducting a pull request review.
Your job is to provide a thorough, constructive code review that helps the developer improve their code.

Focus on:
- Bugs and logic errors (most important)
- Security vulnerabilities
- Performance issues
- Missing error handling
- Missing tests for critical paths
- Code style and maintainability

Be specific: reference the exact file and line number for each issue.
Be constructive: always provide a concrete suggestion, not just criticism.
Be fair: acknowledge what was done well.

You MUST respond with ONLY a valid JSON object matching this exact schema — no markdown, no explanation outside the JSON:
{
  "summary": "2-3 sentence overview of the PR quality",
  "score": <integer 0-100>,
  "issues": [{ "type": "bug|security|style|performance|test", "severity": "critical|warning|suggestion", "file": "path/to/file", "line": <number or null>, "description": "what is wrong", "suggestion": "how to fix it" }],
  "positives": ["thing done well"],
  "missing_tests": <boolean>,
  "breaking_change": <boolean>
}`;

@Injectable()
export class OpenAIProvider implements ReviewProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  getName(): string {
    return 'openai';
  }

  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private buildUserPrompt(diff: DiffInput): string {
    const filesSection = diff.files
      .map(
        (f) =>
          `### File: ${f.filename} (${f.language})\n\`\`\`diff\n${f.patch}\n\`\`\``,
      )
      .join('\n\n');

    return `PR Title: ${diff.prTitle} ${diff.prDescription ? `PR Description: ${diff.prDescription}` : ''}

    ## Changed Files:
        ${filesSection}

    Review the above pull request and respond with the JSON schema only.`;
  }

  async review(diff: DiffInput): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(diff);
    const estimatedTokens = this.estimateTokens(userPrompt);

    this.logger.log(
      { estimatedTokens, files: diff.files.length },
      'Calling OpenAI for review',
    );

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' }, // Structured output mode
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.1, // low temperature for consistent structured output
    });

    const rawJson = response.choices[0]?.message?.content;
    if (!rawJson) throw new Error('Empty response from OpenAI');

    // Parse and validate with Zod — throws if schema mismatch
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error(
        `OpenAI returned invalid JSON: ${rawJson.substring(0, 200)}`,
      );
    }

    const result = ReviewResultSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(
        { errors: result.error.format() },
        'LLM response schema mismatch',
      );
      throw new Error('LLM response did not match expected schema');
    }

    return result.data;
  }
}
