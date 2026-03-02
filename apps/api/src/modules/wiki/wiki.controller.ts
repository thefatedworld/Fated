import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WikiService } from './wiki.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@ApiTags('wiki')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('v1/wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published wiki pages' })
  listPages(@Query('seriesId') seriesId?: string) {
    return this.wikiService.listPages(seriesId);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get wiki page by slug' })
  getPage(@Param('slug') slug: string) {
    return this.wikiService.getPage(slug);
  }

  @Public()
  @Get(':id/history')
  @ApiOperation({ summary: 'Get approved revision history for a wiki page' })
  getHistory(@Param('id') id: string) {
    return this.wikiService.getRevisionHistory(id);
  }

  @Post()
  @Roles(UserRole.approved_member, UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: 'Create a wiki page (submits initial revision for approval)' })
  createPage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      slug: string;
      title: string;
      body: string;
      seriesId?: string;
      taxonomyPath?: string;
      tags?: string[];
    },
  ) {
    return this.wikiService.createPage({ ...body, createdBy: user.id });
  }

  @Post(':id/revisions')
  @Roles(UserRole.approved_member, UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: 'Submit a revision to a wiki page (requires moderation approval)' })
  submitRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') pageId: string,
    @Body() body: { body: string },
  ) {
    return this.wikiService.submitRevision({ pageId, body: body.body, authorId: user.id });
  }

  @Post('revisions/:revisionId/approve')
  @Roles(UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Approve a wiki revision' })
  approveRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('revisionId') revisionId: string,
  ) {
    return this.wikiService.approveRevision(revisionId, user.id, user.role);
  }

  @Post('revisions/:revisionId/reject')
  @Roles(UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Reject a wiki revision' })
  rejectRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('revisionId') revisionId: string,
    @Body() body: { reviewNote: string },
  ) {
    return this.wikiService.rejectRevision(revisionId, user.id, user.role, body.reviewNote);
  }

  @Patch(':id/lock')
  @Roles(UserRole.moderator, UserRole.content_admin, UserRole.superadmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Mod] Lock or unlock a wiki page' })
  toggleLock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') pageId: string,
    @Body() body: { locked: boolean },
  ) {
    return this.wikiService.toggleLock(pageId, body.locked, user.id, user.role);
  }
}
