import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtPayload } from './strategies/jwt.strategy';
import { User } from 'src/domain/user.entity';
import { UserRepository } from 'src/infrastructure/repositories/user-repository';
import { RefreshTokenRepository } from 'src/infrastructure/repositories/refresh-token.repository';
import { IsNull } from 'typeorm';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

interface FindOrCreateUserDto {
  githubId: number;
  githubUsername: string;
  githubAvatarUrl?: string;
  email?: string;
  //   githubAccessToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly installationRepository: InstallationRepository,
  ) {}

  async findOrCreateUser(dto: FindOrCreateUserDto): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { github_id: dto.githubId },
    });

    if (!user) {
      this.logger.log(`Creating new user: ${dto.githubUsername}`);
      user = this.userRepo.create({
        github_id: dto.githubId,
        github_username: dto.githubUsername,
        github_avatar_url: dto.githubAvatarUrl,
        email: dto.email ?? null,
      });
      await this.userRepo.save(user);
    } else {
      // Update profile info on each login
      await this.userRepo.update(user.id, {
        github_username: dto.githubUsername,
        github_avatar_url: dto.githubAvatarUrl,
        ...(dto.email && { email: dto.email }),
      });
    }

    await this.linkOrphanedInstallations(user);
    return user;
  }

  private async linkOrphanedInstallations(user: User): Promise<void> {
    const orphaned = await this.installationRepository.find({
      where: {
        sender_github_id: user.github_id,
        user_id: IsNull(),
      },
    });

    if (orphaned.length === 0) return;

    await this.installationRepository.update(
      { sender_github_id: user.github_id, user_id: IsNull() },
      { user_id: user.id },
    );

    this.logger.log(
      { userId: user.id, linkedCount: orphaned.length },
      'Linked orphaned installations to user on login',
    );
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      githubId: user.github_id,
      username: user.github_username,
      isAdmin: false,
    };

    // Access token: short-lived (15 minutes), RS256 signed
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      algorithm: 'RS256',
    });

    // Refresh token: long-lived (30 days), opaque random string
    const rawRefreshToken = crypto.randomUUID() + '-' + crypto.randomUUID(); // 72 chars of entropy
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Revoke all existing refresh tokens for this user (single-session policy)
    await this.refreshTokenRepo.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true },
    );

    // Save new refresh token hash
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash,
        userId: user.id,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (storedToken.isRevoked) {
      // Possible token theft — revoke all tokens for this user
      this.logger.warn(
        `Revoked refresh token reused for user ${storedToken.userId} — revoking all tokens`,
      );
      await this.refreshTokenRepo.update(
        { userId: storedToken.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, issue new pair
    await this.refreshTokenRepo.update(storedToken.id, { isRevoked: true });
    return this.generateTokenPair(storedToken.user);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    await this.refreshTokenRepo.update({ tokenHash }, { isRevoked: true });
  }
}
