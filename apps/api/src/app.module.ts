import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { SecretsModule } from './infrastructure/secrets/secrets.module';
import { GcsModule } from './infrastructure/gcs/gcs.module';
import { CloudTasksModule } from './infrastructure/cloudtasks/cloudtasks.module';
import { PubSubModule } from './infrastructure/pubsub/pubsub.module';
import { HealthModule } from './infrastructure/health/health.module';

// Common
import { AuditModule } from './common/audit/audit.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContentModule } from './modules/content/content.module';
import { VideoModule } from './modules/video/video.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { IAPModule } from './modules/iap/iap.module';
import { CommunityModule } from './modules/community/community.module';
import { WikiModule } from './modules/wiki/wiki.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExperimentationModule } from './modules/experimentation/experimentation.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,     // 1 minute window
        limit: 120,     // 120 requests per minute per IP (default)
      },
    ]),
    // Infrastructure (global)
    PrismaModule,
    RedisModule,
    SecretsModule,
    GcsModule,
    CloudTasksModule,
    PubSubModule,
    HealthModule,
    // Common
    AuditModule,
    // Feature modules
    AuthModule,
    UsersModule,
    ContentModule,
    VideoModule,
    TokensModule,
    EntitlementsModule,
    IAPModule,
    CommunityModule,
    WikiModule,
    ModerationModule,
    AnalyticsModule,
    NotificationsModule,
    ExperimentationModule,
    RecommendationsModule,
    DistributionModule,
    WatchlistModule,
    ComplianceModule,
    AdminModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global response transform interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global JWT guard (Public decorator bypasses)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global throttle guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
