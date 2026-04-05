import {
  Controller, Get, Post, Delete, UseGuards,
  Req, Res, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from 'src/infrastructure/decorators/public.decorator';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { User } from 'src/domain/user.entity';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,         // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  path: '/api/v1/auth',  // Restrict cookie to auth routes only
};

@Controller({path: 'auth', version: '1'})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // Step 1: Redirect user to GitHub OAuth
  @Get('github')
  @Public()
  @UseGuards(AuthGuard('github'))
  async githubLogin(): Promise<void> {
    // Passport handles the redirect automatically
  }

  // Step 2: GitHub redirects back here with the user profile
  @Get('github/callback')
  @Public()
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user;
    this.logger.log(`OAuth callback for user: ${user.github_username}`);

    const tokens = await this.authService.generateTokenPair(user);

    // Store refresh token in httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    // Redirect to dashboard with access token in URL hash
    // (hash is not sent to server — safe for short-lived tokens)
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3002';
    res.redirect(
      `${dashboardUrl}/auth/callback#access_token=${tokens.accessToken}&expires_in=${tokens.expiresIn}`,
    );
  }

  // Rotate access token using refresh token cookie
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!rawRefreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: { code: 'UNAUTHORIZED', message: 'No refresh token' },
      });
      return;
    }

    const tokens = await this.authService.refreshTokens(rawRefreshToken);
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  // Logout: revoke refresh token and clear cookie
  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (rawRefreshToken) {
      await this.authService.revokeRefreshToken(rawRefreshToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
  }

  // Return the currently authenticated user's profile
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return {
      data: {
        id: user.id,
        githubId: user.github_id,
        username: user.github_username,
        avatarUrl: user.github_avatar_url,
        email: user.email,
        isAdmin: user.is_admin,
      },
    };
  }
}