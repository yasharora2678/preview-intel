import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';

export const OCTOKIT_APP = 'OCTOKIT_APP';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OCTOKIT_APP,
      useFactory: async (config: ConfigService) => {

        const { App } = await import('@octokit/app');

        const { Octokit } = await import('@octokit/core');

        const { restEndpointMethods } = await import('@octokit/plugin-rest-endpoint-methods');

        const MyOctokit = Octokit.plugin(restEndpointMethods);

        const privateKeyPath = config.get<string>('GITHUB_APP_PRIVATE_KEY');

        return new App({
          appId: config.get('GITHUB_APP_ID')!,
          privateKey: readFileSync(privateKeyPath!, 'utf8'),
          webhooks: { secret: config.get('GITHUB_WEBHOOK_SECRET')! },
          Octokit: MyOctokit,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [OCTOKIT_APP],
})
export class GithubAppModule {}