import { Module } from '@nestjs/common';
import { LlmProviderFactory } from './llm-provider.factory';
import { CircuitBreakerService } from './circuit-breaker.service';

@Module({
  imports: [],
  providers: [LlmProviderFactory, CircuitBreakerService],
  exports: [LlmProviderFactory, CircuitBreakerService],
})
export class LlmModule {}
