import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('APP_URL')}/api/v1/auth/github/callback`,
      scope: ['read:user', 'user:email', 'repo'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    // Passport calls this after GitHub redirects back
    // We upsert the user and return them
    const user = await this.authService.findOrCreateUser({
      githubId: Number(profile.id),
      githubUsername: profile.username!,
      githubAvatarUrl: profile.photos?.[0]?.value,
    //   email: profile.emails?.[0]?.value,
    //   githubAccessToken: accessToken,
    });
    return user;
  }
}