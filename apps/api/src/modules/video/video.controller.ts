import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/request.types';
import { AssetVersionType, UserRole } from '@prisma/client';

@ApiTags('video')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('v1')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('episodes/:episodeId/playback')
  @ApiOperation({ summary: 'Get signed playback URL for an episode' })
  @ApiQuery({ name: 'version', required: false, enum: AssetVersionType })
  getPlaybackUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('episodeId') episodeId: string,
    @Query('version') version?: AssetVersionType,
  ) {
    return this.videoService.generatePlaybackUrl(episodeId, user.id, version);
  }

  @Post('admin/episodes/:episodeId/assets/upload-url')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Generate upload URL for episode video asset' })
  generateUploadUrl(
    @Param('episodeId') episodeId: string,
    @Body() body: { versionType?: AssetVersionType; contentType: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.videoService.generateUploadUrl(
      episodeId,
      body.versionType,
      body.contentType,
      user.id,
      user.role,
    );
  }

  @Post('admin/assets/:assetId/confirm')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: '[Admin] Confirm upload complete and activate asset' })
  confirmUpload(
    @Param('assetId') assetId: string,
    @Body() body: { fileSizeBytes: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.videoService.confirmUpload(assetId, body.fileSizeBytes, user.id, user.role);
  }
}
