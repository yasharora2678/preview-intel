import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRepository } from 'src/infrastructure/repositories/user-repository';
import { RefreshTokenRepository } from 'src/infrastructure/repositories/refresh-token.repository';
import { IsAdminGuard } from './guards/is-admin.guard';
import { InstallationRepository } from 'src/infrastructure/repositories/installation.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const parseKey = (key: string) => key.replace(/\\n/g, '\n');

        return {
          privateKey: parseKey(config.get<string>('JWT_PRIVATE_KEY')!),
          publicKey: parseKey(config.get<string>('JWT_PUBLIC_KEY')!),
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '15m',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GithubStrategy,
    JwtStrategy,
    JwtAuthGuard,
    UserRepository,
    RefreshTokenRepository,
    IsAdminGuard,
    InstallationRepository,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    UserRepository,
    IsAdminGuard,
    InstallationRepository,
  ],
})
export class AuthModule {}
