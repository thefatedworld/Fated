import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ThreadType, VoteTargetType } from '@prisma/client';

const EDIT_WINDOW_MINUTES = 15;

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async createThread(params: {
    authorId: string;
    type: ThreadType;
    title: string;
    body: string;
    seriesId?: string;
    episodeId?: string;
  }) {
    return this.prisma.thread.create({
      data: {
        authorId: params.authorId,
        type: params.type,
        title: params.title,
        body: params.body,
        seriesId: params.seriesId ?? null,
        episodeId: params.episodeId ?? null,
      },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } } },
    });
  }

  async listThreads(params: {
    type?: ThreadType;
    seriesId?: string;
    episodeId?: string;
    sort?: 'new' | 'hot';
    limit?: number;
    cursor?: string;
  }) {
    const { type, seriesId, episodeId, sort = 'new', limit = 20, cursor } = params;

    const orderBy = sort === 'hot'
      ? [{ voteCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

    return this.prisma.thread.findMany({
      where: {
        isDeleted: false,
        ...(type && { type }),
        ...(seriesId && { seriesId }),
        ...(episodeId && { episodeId }),
      },
      orderBy,
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } },
        _count: { select: { replies: { where: { isDeleted: false } } } },
      },
    });
  }

  async getThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } },
        replies: {
          where: { isDeleted: false, parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } },
            children: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } },
              },
            },
          },
        },
      },
    });
    if (!thread || thread.isDeleted) throw new NotFoundException('Thread not found');
    return thread;
  }

  async createReply(params: {
    threadId: string;
    authorId: string;
    body: string;
    parentId?: string;
  }) {
    const thread = await this.prisma.thread.findUnique({ where: { id: params.threadId } });
    if (!thread || thread.isDeleted) throw new NotFoundException('Thread not found');
    if (thread.isLocked) throw new ForbiddenException('Thread is locked');

    if (params.parentId) {
      const parent = await this.prisma.threadReply.findUnique({ where: { id: params.parentId } });
      if (!parent || parent.threadId !== params.threadId) {
        throw new BadRequestException('Invalid parent reply');
      }
      // Only 1 level of nesting
      if (parent.parentId) throw new BadRequestException('Max reply nesting depth reached');
    }

    return this.prisma.threadReply.create({
      data: {
        threadId: params.threadId,
        authorId: params.authorId,
        body: params.body,
        parentId: params.parentId ?? null,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerifiedAuthor: true } },
      },
    });
  }

  async editContent(
    type: 'thread' | 'reply',
    id: string,
    body: string,
    actorId: string,
  ) {
    if (type === 'thread') {
      const thread = await this.prisma.thread.findUnique({ where: { id } });
      if (!thread || thread.isDeleted) throw new NotFoundException('Thread not found');
      if (thread.authorId !== actorId) throw new ForbiddenException('Not your thread');

      const editDeadline = new Date(thread.createdAt.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
      if (new Date() > editDeadline) throw new ForbiddenException('Edit window has closed');

      return this.prisma.thread.update({ where: { id }, data: { body } });
    } else {
      const reply = await this.prisma.threadReply.findUnique({ where: { id } });
      if (!reply || reply.isDeleted) throw new NotFoundException('Reply not found');
      if (reply.authorId !== actorId) throw new ForbiddenException('Not your reply');

      const editDeadline = new Date(reply.createdAt.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
      if (new Date() > editDeadline) throw new ForbiddenException('Edit window has closed');

      return this.prisma.threadReply.update({ where: { id }, data: { body } });
    }
  }

  async softDeleteContent(
    type: 'thread' | 'reply',
    id: string,
    actorId: string,
    actorRole: string,
  ) {
    const isAdmin = ['moderator', 'content_admin', 'superadmin'].includes(actorRole);

    if (type === 'thread') {
      const thread = await this.prisma.thread.findUnique({ where: { id } });
      if (!thread || thread.isDeleted) throw new NotFoundException('Thread not found');
      if (!isAdmin && thread.authorId !== actorId) throw new ForbiddenException('Not authorized');

      await this.prisma.thread.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), body: '[deleted]' },
      });
    } else {
      const reply = await this.prisma.threadReply.findUnique({ where: { id } });
      if (!reply || reply.isDeleted) throw new NotFoundException('Reply not found');
      if (!isAdmin && reply.authorId !== actorId) throw new ForbiddenException('Not authorized');

      await this.prisma.threadReply.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), body: '[deleted]' },
      });
    }
  }

  async vote(userId: string, targetType: 'thread' | 'reply', targetId: string, value: 1 | -1) {
    // Ensure target exists and get author
    let authorId: string;
    if (targetType === 'thread') {
      const thread = await this.prisma.thread.findUnique({ where: { id: targetId } });
      if (!thread || thread.isDeleted) throw new NotFoundException('Thread not found');
      authorId = thread.authorId;
    } else {
      const reply = await this.prisma.threadReply.findUnique({ where: { id: targetId } });
      if (!reply || reply.isDeleted) throw new NotFoundException('Reply not found');
      authorId = reply.authorId;
    }

    if (authorId === userId) throw new ForbiddenException('Cannot vote on your own content');

    const prismaTargetType = targetType === 'thread' ? VoteTargetType.thread : VoteTargetType.reply;

    // Get previous vote to calculate delta
    const previous = await this.prisma.vote.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: prismaTargetType, targetId } },
    });
    const previousValue = previous?.value ?? 0;
    const delta = value - previousValue;

    // Upsert vote
    await this.prisma.vote.upsert({
      where: { userId_targetType_targetId: { userId, targetType: prismaTargetType, targetId } },
      create: { userId, targetType: prismaTargetType, targetId, value },
      update: { value },
    });

    // Update denormalized vote count
    if (delta !== 0) {
      if (targetType === 'thread') {
        await this.prisma.thread.update({
          where: { id: targetId },
          data: { voteCount: { increment: delta } },
        });
      } else {
        await this.prisma.threadReply.update({
          where: { id: targetId },
          data: { voteCount: { increment: delta } },
        });
      }
    }

    return { voted: true, value };
  }

  async reportAbuse(params: {
    reporterId: string;
    targetType: 'user' | 'thread' | 'reply' | 'wiki_page';
    targetId: string;
    category: string;
    description?: string;
  }) {
    const { reporterId, targetType, targetId, category, description } = params;
    return this.prisma.abuseReport.create({
      data: {
        reporterId,
        targetType: targetType as never,
        targetId,
        category: category as never,
        description,
      },
    });
  }
}
