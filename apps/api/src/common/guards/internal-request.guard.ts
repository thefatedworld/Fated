import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard for internal Cloud Tasks / Pub/Sub push endpoints.
 * Validates a shared secret in the X-Internal-Secret header.
 */
@Injectable()
export class InternalRequestGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = this.config.get<string>('INTERNAL_API_SECRET', '');
    const header = request.headers['x-internal-secret'];

    if (!secret || header !== secret) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    return true;
  }
}
