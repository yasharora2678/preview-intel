import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import {
  ReviewProvider,
  DiffInput,
  ReviewResult,
} from '../../domain/review/review-provider.interface';

export class CircuitOpenError extends Error {
  constructor(providerName: string) {
    super(`Circuit breaker is open for provider: ${providerName}`);
    this.name = 'CircuitOpenError';
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker<any>>();

  getOrCreateBreaker(provider: ReviewProvider): CircuitBreaker<any> {
    const key = provider.getName();
    if (this.breakers.has(key)) return this.breakers.get(key)!;

    const breaker = new CircuitBreaker(
      (diff: DiffInput) => provider.review(diff),
      {
        timeout: 30_000, // 30s timeout per LLM call
        errorThresholdPercentage: 50,
        resetTimeout: 60_000, // try again after 60s
        volumeThreshold: 5, // minimum 5 requests before opening
      },
    );

    breaker.on('open', () =>
      this.logger.warn({ provider: key }, '🔴 Circuit breaker OPENED'),
    );
    breaker.on('halfOpen', () =>
      this.logger.log({ provider: key }, '🟡 Circuit breaker HALF-OPEN'),
    );
    breaker.on('close', () =>
      this.logger.log({ provider: key }, '🟢 Circuit breaker CLOSED'),
    );

    this.breakers.set(key, breaker);
    return breaker;
  }

  async review(
    provider: ReviewProvider,
    diff: DiffInput,
  ): Promise<ReviewResult> {
    const breaker = this.getOrCreateBreaker(provider);
    try {
      return (await breaker.fire(diff)) as Promise<ReviewResult>;
    } catch (error) {
      // opossum throws a generic error when circuit is open.
      // We check breaker.opened to distinguish "circuit open" from a real LLM error
      if (breaker.opened) {
        throw new CircuitOpenError(provider.getName());
      }
      throw error;
    }
  }
}
