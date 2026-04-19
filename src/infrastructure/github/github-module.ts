import { Module } from '@nestjs/common';
import { GithubCommentService } from './github-comment.service';
import { GithubClientService } from './github-client.service';
import { GithubAppModule } from './github-app.module';

@Module({
  imports: [GithubAppModule],
  providers: [GithubClientService, GithubCommentService],
  exports: [GithubClientService, GithubCommentService],
})
export class GithubModule {}
