import { Module } from '@nestjs/common';
import { LlmProviderFactory } from './llm-provider.factory';
import { CircuitBreakerService } from './circuit-breaker.service';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

@Module({
  imports: [],
  providers: [LlmProviderFactory, CircuitBreakerService, InstallationRepository],
  exports: [LlmProviderFactory, CircuitBreakerService, InstallationRepository],
})
export class LlmModule {}
