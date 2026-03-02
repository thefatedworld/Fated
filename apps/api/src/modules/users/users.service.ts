import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '@prisma/client';

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  isVerifiedAuthor: true,
  createdAt: true,
};

const USER_PRIVATE_SELECT = {
  ...USER_PUBLIC_SELECT,
  email: true,
  emailVerified: true,
  isBanned: true,
  banExpiresAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PRIVATE_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: USER_PRIVATE_SELECT,
    });
  }

  async updateRole(actorRole: UserRole, targetUserId: string, newRole: UserRole) {
    // Only superadmin can assign superadmin
    if (newRole === UserRole.superadmin && actorRole !== UserRole.superadmin) {
      throw new Error('Only superadmin can assign superadmin role');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: USER_PRIVATE_SELECT,
    });
  }

  async registerPushToken(
    userId: string,
    fcmToken: string,
    platform: 'ios' | 'android',
    deviceId?: string,
  ) {
    // Upsert by deviceId+userId or just create new
    return this.prisma.pushToken.upsert({
      where: {
        // We need a unique constraint — use a compound approach
        id: (
          await this.prisma.pushToken.findFirst({
            where: { userId, deviceId: deviceId ?? null },
            select: { id: true },
          })
        )?.id ?? 'new',
      },
      update: {
        fcmToken,
        platform,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        fcmToken,
        platform,
        deviceId,
        isActive: true,
      },
    });
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: Partial<{
      episodeDrops: boolean;
      countdownReminders: boolean;
      communityReplies: boolean;
      authorQa: boolean;
      promotions: boolean;
    }>,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: prefs,
      create: { userId, ...prefs },
    });
  }
}
