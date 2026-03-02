import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SeriesStatus } from '@prisma/client';

export interface RankedSeries {
  seriesId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  genreTags: string[];
  score: number;
  reasonCode: string;
}

/**
 * ML-ready interface contract.
 * Rules-based implementation; swap for ML model without changing consumers.
 */
export interface RecommendationsProvider {
  getRankedSeries(userId: string, limit: number): Promise<RankedSeries[]>;
}

@Injectable()
export class RecommendationsService implements RecommendationsProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getRankedSeries(userId: string, limit = 10): Promise<RankedSeries[]> {
    // Get user's genre preferences from viewing history (simplified: use entitlements)
    const userEntitlements = await this.prisma.entitlement.findMany({
      where: { userId, revokedAt: null },
      include: { series: { select: { genreTags: true, id: true } } },
      take: 20,
    });

    const genreWeights: Record<string, number> = {};
    for (const ent of userEntitlements) {
      if (ent.series) {
        for (const tag of ent.series.genreTags) {
          genreWeights[tag] = (genreWeights[tag] ?? 0) + 1;
        }
      }
    }

    // Get series user is already engaged with
    const engagedSeriesIds = new Set(
      userEntitlements.map((e) => e.seriesId).filter(Boolean) as string[],
    );

    // Fetch all published series
    const allSeries = await this.prisma.series.findMany({
      where: {
        status: SeriesStatus.published,
        isDeleted: false,
        id: { notIn: [...engagedSeriesIds] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImageUrl: true,
        genreTags: true,
        createdAt: true,
      },
    });

    // Score each series
    const now = Date.now();
    const scored = allSeries.map((s) => {
      // Genre affinity score (0-1)
      const genreScore =
        s.genreTags.reduce((acc, tag) => acc + (genreWeights[tag] ?? 0), 0) /
        Math.max(s.genreTags.length, 1);

      // Recency score (0-1): newer = higher
      const ageMs = now - s.createdAt.getTime();
      const maxAgeMs = 365 * 24 * 3600 * 1000;
      const recencyScore = Math.max(0, 1 - ageMs / maxAgeMs);

      const score = 0.6 * Math.min(genreScore, 1) + 0.4 * recencyScore;

      return {
        seriesId: s.id,
        title: s.title,
        slug: s.slug,
        coverImageUrl: s.coverImageUrl,
        genreTags: s.genreTags,
        score: Math.round(score * 1000) / 1000,
        reasonCode: genreScore > 0 ? 'genre_affinity' : 'new_release',
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
