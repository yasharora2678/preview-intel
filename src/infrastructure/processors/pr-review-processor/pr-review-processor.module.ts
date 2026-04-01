
import { Module } from '@nestjs/common';
import { PrReviewProcessor } from './pr-review-processor';
import { LlmModule } from 'src/infrastructure/llm/llm.module';
import { ReviewModule } from 'src/features/reviews/reviews.module';
import { GithubModule } from 'src/infrastructure/github/github-module';

@Module({
  imports: [
    GithubModule,
    LlmModule,
    ReviewModule
  ],
  providers: [
    PrReviewProcessor,
    // ReviewsService,
  ],
})
export class ProcessorModule {}