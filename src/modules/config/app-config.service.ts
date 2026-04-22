import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  get nodeEnv() {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port() {
    return this.configService.get('PORT', { infer: true });
  }

  get apiPrefix() {
    return this.configService.get('API_PREFIX', { infer: true });
  }

  get appName() {
    return this.configService.get('APP_NAME', { infer: true });
  }

  get appDescription() {
    return this.configService.get('APP_DESCRIPTION', { infer: true });
  }

  get allowedOrigins() {
    return this.configService
      .get('ALLOWED_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get databaseUrl() {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get jwtAccessSecret() {
    return this.configService.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtRefreshSecret() {
    return this.configService.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessExpiresIn() {
    return this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true });
  }

  get jwtRefreshExpiresIn() {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true });
  }

  get bcryptSaltRounds() {
    return this.configService.get('BCRYPT_SALT_ROUNDS', { infer: true });
  }
}

