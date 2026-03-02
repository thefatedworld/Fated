import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ExperimentStatus } from '@prisma/client';
import * as crypto from 'crypto';

interface VariantAssignment {
  experimentId: string;
  variant: string;
  cached: boolean;
}

@Injectable()
export class ExperimentationService {
  private readonly ASSIGNMENT_CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getVariant(userId: string, experimentName: string): Promise<VariantAssignment | null> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { name: experimentName },
    });

    if (!experiment || experiment.status !== ExperimentStatus.active) return null;

    const now = new Date();
    if (experiment.startsAt && experiment.startsAt > now) return null;
    if (experiment.endsAt && experiment.endsAt < now) return null;

    // Check Redis cache
    const cacheKey = `exp:${userId}:${experiment.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { experimentId: experiment.id, variant: cached, cached: true };
    }

    // Check DB assignment (sticky)
    const existing = await this.prisma.experimentAssignment.findUnique({
      where: { userId_experimentId: { userId, experimentId: experiment.id } },
    });

    if (existing) {
      await this.redis.set(cacheKey, existing.variant, this.ASSIGNMENT_CACHE_TTL);
      return { experimentId: experiment.id, variant: existing.variant, cached: false };
    }

    // New assignment — deterministic hash-based
    const trafficSplit = experiment.trafficSplit as Record<string, number>;
    const variant = this.assignVariant(userId, experiment.id, trafficSplit);

    await this.prisma.experimentAssignment.create({
      data: { userId, experimentId: experiment.id, variant },
    });

    await this.redis.set(cacheKey, variant, this.ASSIGNMENT_CACHE_TTL);

    return { experimentId: experiment.id, variant, cached: false };
  }

  private assignVariant(
    userId: string,
    experimentId: string,
    trafficSplit: Record<string, number>,
  ): string {
    const hash = crypto
      .createHash('md5')
      .update(`${userId}:${experimentId}`)
      .digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;

    let cumulative = 0;
    for (const [variant, fraction] of Object.entries(trafficSplit)) {
      cumulative += Math.round(fraction * 100);
      if (bucket < cumulative) return variant;
    }

    return Object.keys(trafficSplit)[0]; // fallback
  }

  async createExperiment(data: {
    name: string;
    description?: string;
    type: string;
    trafficSplit: Record<string, number>;
    metricBindings?: string[];
    startsAt?: Date;
    endsAt?: Date;
  }) {
    return this.prisma.experiment.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type as never,
        trafficSplit: data.trafficSplit,
        metricBindings: data.metricBindings ? { metrics: data.metricBindings } : undefined,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });
  }

  async listExperiments() {
    return this.prisma.experiment.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
