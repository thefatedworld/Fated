import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.content_admin, UserRole.analytics_admin, UserRole.superadmin)
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  @Get('audit-log')
  @ApiOperation({ summary: '[Admin] Query audit log' })
  getAuditLog(
    @Query('actorId') actorId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(actorId && { actorId }),
        ...(targetType && { targetType }),
        ...(targetId && { targetId }),
        ...(action && { action: action as never }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  @Get('users')
  @ApiOperation({ summary: '[Admin] List users' })
  listUsers(
    @Query('role') role?: UserRole,
    @Query('banned') banned?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(banned === 'true' && { isBanned: true }),
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isVerifiedAuthor: true,
        isBanned: true,
        banExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  @Patch('users/:userId/role')
  @Roles(UserRole.superadmin)
  @ApiOperation({ summary: '[Superadmin] Update user role' })
  updateUserRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: { role: UserRole },
  ) {
    return this.usersService.updateRole(actor.role as UserRole, userId, body.role);
  }

  @Patch('users/:userId/verify-author')
  @Roles(UserRole.superadmin)
  @ApiOperation({ summary: '[Superadmin] Grant verified author badge' })
  verifyAuthor(@Param('userId') userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerifiedAuthor: true, role: UserRole.author },
    });
  }
}
