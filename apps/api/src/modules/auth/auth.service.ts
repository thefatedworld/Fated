import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditAction } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          { username: dto.username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new ConflictException('Email already in use');
      }
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dto.username.toLowerCase(),
          email: dto.email.toLowerCase(),
          displayName: dto.displayName ?? dto.username,
          passwordHash,
        },
      });

      // Create token wallet for the user
      await tx.tokenWallet.create({
        data: { userId: newUser.id },
      });

      // Create default notification preferences
      await tx.notificationPreference.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    await this.audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.user_register,
      targetType: 'user',
      targetId: user.id,
      payload: { email: user.email, username: user.username },
      ipAddress,
      userAgent,
    });

    return this.generateTokenPair(user.id, user.email, user.username, user.role);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.isBanned) {
      const isTimedOut = user.banExpiresAt && user.banExpiresAt > new Date();
      if (!user.banExpiresAt || isTimedOut) {
        throw new UnauthorizedException('Account is suspended');
      }
      // Timeout expired — clear ban
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isBanned: false, banExpiresAt: null },
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.user_login,
      targetType: 'user',
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    return this.generateTokenPair(
      user.id,
      user.email,
      user.username,
      user.role,
      dto.deviceId,
    );
  }

  async refresh(rawToken: string, deviceId?: string): Promise<TokenPair> {
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);

    // Find by hash — note: bcrypt compare required (can't query by hash directly)
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        deviceId: deviceId ?? null,
      },
      include: { user: true },
    });

    // Find matching token (bcrypt compare each one)
    let matched: (typeof tokens)[0] | null = null;
    for (const token of tokens) {
      const valid = await bcrypt.compare(rawToken, token.tokenHash);
      if (valid) {
        matched = token;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user } = matched;

    if (user.deletedAt || user.isBanned) {
      throw new UnauthorizedException('Account suspended or deleted');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokenPair(user.id, user.email, user.username, user.role, deviceId);
  }

  async logout(userId: string, deviceId?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(deviceId ? { deviceId } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    username: string,
    role: string,
    deviceId?: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, username, role };
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');

    const accessToken = this.jwt.sign(payload, { expiresIn });

    // Generate opaque refresh token
    const rawRefreshToken = uuidv4() + uuidv4(); // 72-char random string
    const refreshHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);

    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshExpiresAt = new Date(
      Date.now() + this.parseDurationMs(refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        deviceId: deviceId ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.parseDurationMs(expiresIn) / 1000,
    };
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 86400 * 1000,
    };
    return value * (multipliers[unit] ?? 1000);
  }
}
