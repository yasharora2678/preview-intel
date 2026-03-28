import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  DiffInput,
  ReviewProvider,
  ReviewResult,
  ReviewResultSchema,
} from '../review-provider.interface';

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
export class HuggingFaceProvider implements ReviewProvider {
  private readonly logger = new Logger(HuggingFaceProvider.name);

  private readonly MODEL = 'Qwen/Qwen2.5-Coder-32B-Instruct';

  // ✅ Correct router URL — no /hf-inference/ segment
  private readonly API_URL =
    'https://router.huggingface.co/v1/chat/completions';

  private readonly API_KEY: string;

  constructor(apiKey: string) {
    this.API_KEY = apiKey;
  }

  getName(): string { return 'huggingface'; }
  getModel(): string { return this.MODEL; }
  estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

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

    this.logger.log({ files: diff.files.length }, 'Calling HuggingFace model');

    const response = await axios.post(
      this.API_URL,
      {
        model: this.MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 180000,
      },
    );

    const text = response.data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from HuggingFace');
    }

    let parsed: unknown;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error();
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(
        `HuggingFace returned invalid JSON: ${text.substring(0, 200)}`,
      );
    }

    const validated = ReviewResultSchema.safeParse(parsed);
    if (!validated.success) {
      this.logger.error({ errors: validated.error.format() }, 'LLM response schema mismatch');
      throw new Error('LLM response did not match expected schema');
    }

    return validated.data;
  }
}