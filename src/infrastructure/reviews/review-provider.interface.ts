import { DiffInput, ReviewResult } from './review-schema';

export interface ReviewProvider {
  review(diff: DiffInput): Promise<ReviewResult>;
  getName(): string;
}

/** Injection token for the provider registry map */
export const LLM_PROVIDER_REGISTRY = Symbol('LLM_PROVIDER_REGISTRY');