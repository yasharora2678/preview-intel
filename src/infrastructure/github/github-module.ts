// apps/backend/src/github/github.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { App as OctokitApp } from '@octokit/app';
import { GithubCommentService } from './github-comment.service';
import { GithubClientService } from './github-client-service';

export const OCTOKIT_APP = 'OCTOKIT_APP'; // injection token

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OCTOKIT_APP,
      useFactory: (config: ConfigService) =>
        new OctokitApp({
          appId: config.get('GITHUB_APP_ID')!,
          privateKey: config.get('GITHUB_APP_PRIVATE_KEY')!.replace(/\\n/g, '\n'),
          webhooks: { secret: config.get('GITHUB_WEBHOOK_SECRET')! },
        }),
      inject: [ConfigService],
    },
    GithubClientService,
    GithubCommentService,
  ],
  exports: [GithubClientService, GithubCommentService, OCTOKIT_APP],
})
export class GithubModule {}