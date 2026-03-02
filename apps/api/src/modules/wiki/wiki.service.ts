import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, UserRole, WikiRevisionStatus } from '@prisma/client';

@Injectable()
export class WikiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPage(params: {
    slug: string;
    title: string;
    body: string;
    seriesId?: string;
    taxonomyPath?: string;
    tags?: string[];
    createdBy: string;
  }) {
    const existing = await this.prisma.wikiPage.findUnique({ where: { slug: params.slug } });
    if (existing) throw new BadRequestException(`Slug "${params.slug}" already in use`);

    const page = await this.prisma.wikiPage.create({
      data: {
        slug: params.slug,
        title: params.title,
        seriesId: params.seriesId ?? null,
        taxonomyPath: params.taxonomyPath,
        tags: params.tags ?? [],
        createdBy: params.createdBy,
      },
    });

    // Submit initial revision (pending)
    await this.submitRevision({
      pageId: page.id,
      body: params.body,
      authorId: params.createdBy,
    });

    return page;
  }

  async submitRevision(params: {
    pageId: string;
    body: string;
    authorId: string;
  }) {
    const page = await this.prisma.wikiPage.findUnique({ where: { id: params.pageId } });
    if (!page) throw new NotFoundException('Wiki page not found');
    if (page.isLocked) throw new ForbiddenException('This page is locked');

    const latestRevision = await this.prisma.wikiRevision.findFirst({
      where: { pageId: params.pageId },
      orderBy: { versionNum: 'desc' },
    });
    const versionNum = (latestRevision?.versionNum ?? 0) + 1;

    return this.prisma.wikiRevision.create({
      data: {
        pageId: params.pageId,
        body: params.body,
        authorId: params.authorId,
        status: WikiRevisionStatus.pending,
        versionNum,
      },
    });
  }

  async approveRevision(revisionId: string, reviewerId: string, reviewerRole: string) {
    const revision = await this.prisma.wikiRevision.findUnique({
      where: { id: revisionId },
      include: { page: true },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    if (revision.status !== WikiRevisionStatus.pending) {
      throw new BadRequestException('Revision is not pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wikiRevision.update({
        where: { id: revisionId },
        data: {
          status: WikiRevisionStatus.approved,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await tx.wikiPage.update({
        where: { id: revision.pageId },
        data: { currentRevId: revisionId, isPublished: true },
      });
    });

    await this.audit.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: AuditAction.wiki_approve,
      targetType: 'wiki_revision',
      targetId: revisionId,
    });
  }

  async rejectRevision(
    revisionId: string,
    reviewerId: string,
    reviewerRole: string,
    reviewNote: string,
  ) {
    const revision = await this.prisma.wikiRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new NotFoundException('Revision not found');
    if (revision.status !== WikiRevisionStatus.pending) {
      throw new BadRequestException('Revision is not pending');
    }

    await this.prisma.wikiRevision.update({
      where: { id: revisionId },
      data: {
        status: WikiRevisionStatus.rejected,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote,
      },
    });

    await this.audit.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: AuditAction.wiki_reject,
      targetType: 'wiki_revision',
      targetId: revisionId,
      payload: { reviewNote },
    });
  }

  async getPage(slug: string) {
    const page = await this.prisma.wikiPage.findUnique({
      where: { slug },
      include: {
        revisions: {
          where: { status: WikiRevisionStatus.approved },
          orderBy: { versionNum: 'desc' },
          take: 1,
        },
        creator: { select: { id: true, username: true } },
      },
    });
    if (!page || !page.isPublished) throw new NotFoundException('Wiki page not found');
    return page;
  }

  async getRevisionHistory(pageId: string) {
    return this.prisma.wikiRevision.findMany({
      where: { pageId, status: WikiRevisionStatus.approved },
      orderBy: { versionNum: 'desc' },
      include: { author: { select: { id: true, username: true } } },
    });
  }

  async listPages(seriesId?: string) {
    return this.prisma.wikiPage.findMany({
      where: { isPublished: true, ...(seriesId && { seriesId }) },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        taxonomyPath: true,
        tags: true,
        updatedAt: true,
        series: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async toggleLock(pageId: string, locked: boolean, actorId: string, actorRole: string) {
    const page = await this.prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Wiki page not found');

    await this.prisma.wikiPage.update({ where: { id: pageId }, data: { isLocked: locked } });

    await this.audit.log({
      actorId,
      actorRole,
      action: locked ? AuditAction.content_lock : AuditAction.content_restore,
      targetType: 'wiki_page',
      targetId: pageId,
    });
  }

  async getPendingRevisions(limit = 50, cursor?: string) {
    return this.prisma.wikiRevision.findMany({
      where: { status: WikiRevisionStatus.pending },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        page: { select: { id: true, slug: true, title: true } },
        author: { select: { id: true, username: true } },
      },
    });
  }
}
