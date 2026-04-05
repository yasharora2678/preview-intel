import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
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
- "file" is ALWAYS required. Use the exact filename from the PR diff (e.g. "src/app.module.ts").
- Never use null for "file". If unsure, use the most relevant file from the changed files.
- "line" should be a specific line number whenever possible. Use null ONLY for file-level observations with no single location (e.g. "this file lacks error handling throughout"). For style issues, use the line of the first occurrence.
- Do not include any explanation outside the JSON object.`;

@Injectable()
export class OpenAIProvider implements ReviewProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly MODEL = 'gpt-4o';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'openai';
  }

  getModel(): string {
    return this.MODEL;
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
