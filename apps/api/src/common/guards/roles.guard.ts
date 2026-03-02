import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../types/request.types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  approved_member: 1,
  moderator: 2,
  author: 2,
  content_admin: 3,
  analytics_admin: 3,
  superadmin: 10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Authentication required');

    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const hasAccess = requiredRoles.some((role) => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 999;
      return userLevel >= requiredLevel;
    });

    if (!hasAccess) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
