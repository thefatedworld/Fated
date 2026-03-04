import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('v1')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analytics/events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest analytics event (client-side beacon)' })
  track(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      eventType: string;
      sessionId?: string;
      episodeId?: string;
      seriesId?: string;
      properties?: Record<string, unknown>;
    },
  ) {
    return this.analyticsService.track({
      eventType: body.eventType as never,
      userId: user.id,
      sessionId: body.sessionId,
      episodeId: body.episodeId,
      seriesId: body.seriesId,
      properties: body.properties,
    });
  }

  @Get('author/series/:seriesId/analytics')
  @Roles(UserRole.author, UserRole.content_admin, UserRole.analytics_admin, UserRole.superadmin)
  @ApiOperation({ summary: 'Author: get analytics for own series' })
  getSeriesAnalytics(
    @Param('seriesId') seriesId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getAuthorSeriesAnalytics(seriesId, days ? parseInt(days, 10) : 30);
  }

  @Get('admin/analytics/platform')
  @Roles(UserRole.analytics_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Platform-wide KPI snapshot' })
  getPlatformSnapshot(@Query('days') days?: string) {
    return this.analyticsService.getPlatformSnapshot(days ? parseInt(days, 10) : 7);
  }

  @Get('admin/analytics/community')
  @Roles(UserRole.analytics_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Community engagement, wiki activity, and moderation stats' })
  getCommunityStats(@Query('days') days?: string) {
    return this.analyticsService.getCommunityStats(days ? parseInt(days, 10) : 7);
  }

  @Get('admin/analytics/trending')
  @Roles(UserRole.analytics_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Trending series ranked by views' })
  getTrendingSeries(@Query('days') days?: string) {
    return this.analyticsService.getTrendingSeries(days ? parseInt(days, 10) : 7);
  }
}
