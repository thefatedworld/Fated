import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('v1')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ── SERIES (public reads, admin writes) ──

  @Public()
  @Get('series')
  @ApiOperation({ summary: 'List published series' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  listSeries(@Query('all') all?: string, @CurrentUser() user?: AuthenticatedUser) {
    const isAdmin = user?.role && (
      user.role === UserRole.content_admin || user.role === UserRole.superadmin
    );
    return this.contentService.listSeries(all === 'true' && !!isAdmin);
  }

  @Public()
  @Get('series/:id')
  @ApiOperation({ summary: 'Get series by ID' })
  getSeriesById(@Param('id') id: string) {
    return this.contentService.getSeriesById(id);
  }

  @Post('admin/series')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Create series' })
  createSeries(@Body() dto: CreateSeriesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.createSeries(dto, user.id, user.role);
  }

  @Patch('admin/series/:id')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Update series' })
  updateSeries(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSeriesDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.updateSeries(id, dto, user.id, user.role);
  }

  @Post('admin/series/:id/publish')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Publish series' })
  publishSeries(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.publishSeries(id, user.id, user.role);
  }

  @Delete('admin/series/:id')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Soft delete series' })
  deleteSeries(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.softDeleteSeries(id, user.id, user.role);
  }

  @Post('admin/series/:id/restore')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Restore soft-deleted series' })
  restoreSeries(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.restoreSeries(id, user.id, user.role);
  }

  // ── EPISODES (public reads, admin writes) ──

  @Public()
  @Get('series/:seriesId/episodes')
  @ApiOperation({ summary: 'List published episodes for a series' })
  listEpisodes(
    @Param('seriesId') seriesId: string,
    @Query('all') all?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const isAdmin = user?.role && (
      user.role === UserRole.content_admin || user.role === UserRole.superadmin
    );
    return this.contentService.listEpisodes(seriesId, all === 'true' && !!isAdmin);
  }

  @Public()
  @Get('episodes/:id')
  @ApiOperation({ summary: 'Get episode by ID' })
  getEpisodeById(@Param('id') id: string) {
    return this.contentService.getEpisodeById(id);
  }

  @Post('admin/series/:seriesId/episodes')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Create episode' })
  createEpisode(
    @Param('seriesId') seriesId: string,
    @Body() dto: CreateEpisodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.createEpisode(seriesId, dto, user.id, user.role);
  }

  @Post('admin/episodes/:id/publish')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Immediately publish episode' })
  publishEpisode(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.publishEpisode(id, user.id, user.role);
  }

  @Post('admin/episodes/:id/schedule')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Schedule episode publish' })
  scheduleEpisode(
    @Param('id') id: string,
    @Body() body: { scheduledAt: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.scheduleEpisode(id, new Date(body.scheduledAt), user.id, user.role);
  }

  @Delete('admin/episodes/:id')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Soft delete episode' })
  deleteEpisode(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.softDeleteEpisode(id, user.id, user.role);
  }

  @Post('admin/episodes/:id/restore')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Restore soft-deleted episode' })
  restoreEpisode(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.restoreEpisode(id, user.id, user.role);
  }
}
