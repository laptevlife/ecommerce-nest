import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.appConfig.bcryptSaltRounds);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
      },
    });

    await this.auditLogsService.create({
      actorUserId: user.id,
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: user.id,
      description: `Registered user ${user.email}`,
    });

    return this.buildAuthResponse(user.id);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const response = await this.buildAuthResponse(user.id);
    await this.auditLogsService.create({
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'auth',
      entityId: user.id,
      description: `User ${user.email} logged in`,
    });
    return response;
  }

  async refresh(userId: string): Promise<AuthResponseDto> {
    return this.buildAuthResponse(userId);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    await this.auditLogsService.create({
      actorUserId: userId,
      action: AuditAction.LOGOUT,
      entityType: 'auth',
      entityId: userId,
      description: `User ${user.email} logged out`,
    });
  }

  private async buildAuthResponse(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtAccessSecret,
        expiresIn: this.appConfig.jwtAccessExpiresIn as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshExpiresIn as never,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      this.appConfig.bcryptSaltRounds,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
