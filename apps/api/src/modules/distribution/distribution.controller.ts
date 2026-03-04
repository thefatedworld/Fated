import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/request.types';
import { DistributionFormat, DistributionPlatform, UserRole } from '@prisma/client';

@ApiTags('distribution')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.author, UserRole.content_admin, UserRole.superadmin)
@Controller('v1/distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List distribution jobs (own jobs for authors, all for admins)' })
  listJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('episodeId') episodeId?: string,
  ) {
    return this.distributionService.listJobs(user.id, user.role as UserRole, episodeId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get distribution job details' })
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.distributionService.getJob(id, user.id, user.role as UserRole);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a distribution job for an episode' })
  createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      episodeId: string;
      targetFormat: DistributionFormat;
      targetPlatform: DistributionPlatform;
      inputAssetId?: string;
    },
  ) {
    return this.distributionService.createJob({
      ...body,
      requestedBy: user.id,
      requestedByRole: user.role as UserRole,
    });
  }

  @Post('jobs/:id/retry')
  @Roles(UserRole.content_admin, UserRole.superadmin)
  @ApiOperation({ summary: 'Retry a failed or stuck distribution job' })
  retryJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.distributionService.retryJob(id, user.id, user.role as UserRole);
  }
}
