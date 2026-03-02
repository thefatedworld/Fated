import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
@Controller('v1/admin/moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  @ApiOperation({ summary: '[Mod] Get moderation queue (reports or wiki revisions)' })
  getQueue(
    @Query('type') type?: 'reports' | 'wiki',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.moderationService.getModerationQueue({
      type,
      limit: limit ? parseInt(limit, 10) : 50,
      cursor,
    });
  }

  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Ban a user permanently' })
  banUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Body() body: { reason: string },
  ) {
    return this.moderationService.banUser(targetUserId, user.id, user.role, body.reason);
  }

  @Post('users/:userId/timeout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Timeout a user for N seconds' })
  timeoutUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Body() body: { reason: string; durationSeconds: number },
  ) {
    return this.moderationService.banUser(
      targetUserId,
      user.id,
      user.role,
      body.reason,
      body.durationSeconds,
    );
  }

  @Post('users/:userId/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Unban a user' })
  unbanUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ) {
    return this.moderationService.unbanUser(targetUserId, user.id, user.role);
  }

  @Post('threads/:threadId/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Pin or unpin a thread' })
  pinThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() body: { pinned: boolean },
  ) {
    return this.moderationService.pinThread(threadId, body.pinned, user.id, user.role);
  }

  @Post('threads/:threadId/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Lock or unlock a thread' })
  lockThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() body: { locked: boolean },
  ) {
    return this.moderationService.lockThread(threadId, body.locked, user.id, user.role);
  }

  @Post('reports/:reportId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Resolve an abuse report' })
  resolveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Body() body: { resolution: 'actioned' | 'dismissed'; note?: string },
  ) {
    return this.moderationService.resolveReport(
      reportId,
      body.resolution,
      user.id,
      user.role,
      body.note,
    );
  }
}
