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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { ThreadType } from '@prisma/client';

@ApiTags('community')
@ApiBearerAuth()
@Controller('v1/community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Public()
  @Get('threads')
  @ApiOperation({ summary: 'List threads (global, series, or episode-scoped)' })
  @ApiQuery({ name: 'type', required: false, enum: ThreadType })
  @ApiQuery({ name: 'seriesId', required: false })
  @ApiQuery({ name: 'episodeId', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['new', 'hot'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  listThreads(
    @Query('type') type?: ThreadType,
    @Query('seriesId') seriesId?: string,
    @Query('episodeId') episodeId?: string,
    @Query('sort') sort?: 'new' | 'hot',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.communityService.listThreads({
      type,
      seriesId,
      episodeId,
      sort,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
  }

  @Public()
  @Get('threads/:id')
  @ApiOperation({ summary: 'Get thread with replies' })
  getThread(@Param('id') id: string) {
    return this.communityService.getThread(id);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create a new thread' })
  createThread(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      type: ThreadType;
      title: string;
      body: string;
      seriesId?: string;
      episodeId?: string;
    },
  ) {
    return this.communityService.createThread({ authorId: user.id, ...body });
  }

  @Post('threads/:id/replies')
  @ApiOperation({ summary: 'Reply to a thread' })
  createReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') threadId: string,
    @Body() body: { body: string; parentId?: string },
  ) {
    return this.communityService.createReply({ threadId, authorId: user.id, ...body });
  }

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Edit thread body (within 15-minute window)' })
  editThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.communityService.editContent('thread', id, body.body, user.id);
  }

  @Patch('replies/:id')
  @ApiOperation({ summary: 'Edit reply body (within 15-minute window)' })
  editReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.communityService.editContent('reply', id, body.body, user.id);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete thread (own, or mod/admin)' })
  deleteThread(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.communityService.softDeleteContent('thread', id, user.id, user.role);
  }

  @Delete('replies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reply (own, or mod/admin)' })
  deleteReply(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.communityService.softDeleteContent('reply', id, user.id, user.role);
  }

  @Post('threads/:id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on a thread (+1 or -1)' })
  voteThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { value: 1 | -1 },
  ) {
    return this.communityService.vote(user.id, 'thread', id, body.value);
  }

  @Post('replies/:id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on a reply (+1 or -1)' })
  voteReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { value: 1 | -1 },
  ) {
    return this.communityService.vote(user.id, 'reply', id, body.value);
  }

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an abuse report' })
  reportAbuse(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      targetType: 'user' | 'thread' | 'reply' | 'wiki_page';
      targetId: string;
      category: string;
      description?: string;
    },
  ) {
    return this.communityService.reportAbuse({ reporterId: user.id, ...body });
  }
}
