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

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // RS256: sign with PRIVATE key, verify with PUBLIC key
        privateKey: config
          .get<string>('JWT_PRIVATE_KEY')!
          .replace(/\\n/g, '\n'),
        publicKey: config.get<string>('JWT_PUBLIC_KEY')!.replace(/\\n/g, '\n'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      }),
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
  ],
  exports: [AuthService, JwtAuthGuard, UserRepository, IsAdminGuard],
})
export class AuthModule {}
