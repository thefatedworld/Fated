import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async addToWatchlist(userId: string, seriesId: string) {
    await this.prisma.userWatchlist.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: { userId, seriesId },
      update: {},
    });
    return { added: true };
  }

  async removeFromWatchlist(userId: string, seriesId: string) {
    await this.prisma.userWatchlist.deleteMany({
      where: { userId, seriesId },
    });
    return { removed: true };
  }

  async getWatchlist(userId: string) {
    const entries = await this.prisma.userWatchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            coverImageUrl: true,
            genreTags: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    return entries.map((e) => e.series);
  }

  async isOnWatchlist(userId: string, seriesId: string) {
    const entry = await this.prisma.userWatchlist.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
    });
    return { onWatchlist: !!entry };
  }
}
