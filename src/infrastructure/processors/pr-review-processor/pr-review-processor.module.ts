
import { Module } from '@nestjs/common';
import { GithubModule } from 'src/infrastructure/github/github-module';
import { PrReviewProcessor } from './pr-review-processor';
import { ReviewsRepository } from 'src/infrastructure/repositories/review-repository';
import { LlmModule } from 'src/features/llm/llm.module';

@Module({
  imports: [
    GithubModule,
    LlmModule,
  ],
  providers: [
    PrReviewProcessor,
    ReviewsRepository,
  ],
})
export class ProcessorModule {}