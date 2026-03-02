import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthIndicatorResult } from '@nestjs/terminus';

class RedisHealthIndicator {
  constructor(private readonly redis: RedisService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isAlive = await this.redis.ping();
    if (!isAlive) {
      return { [key]: { status: 'down' } };
    }
    return { [key]: { status: 'up' } };
  }
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly redisIndicator: RedisHealthIndicator;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.redisIndicator = new RedisHealthIndicator(redis);
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check — readiness probe' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('db', this.prisma),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }
}
