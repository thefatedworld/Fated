import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitlementsService } from './entitlements.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('entitlements')
@ApiBearerAuth()
@Controller('v1')
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get('entitlements')
  @ApiOperation({ summary: 'List my entitlements (unlocked content)' })
  getMyEntitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.entitlementsService.getMyEntitlements(user.id);
  }

  @Get('episodes/:episodeId/entitlement')
  @ApiOperation({ summary: 'Check if I am entitled to an episode' })
  checkEntitlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('episodeId') episodeId: string,
  ) {
    return this.entitlementsService.checkEntitlement(user.id, episodeId);
  }

  @Post('episodes/:episodeId/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock an episode by spending tokens' })
  unlockEpisode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('episodeId') episodeId: string,
  ) {
    return this.entitlementsService.unlockEpisode(user.id, episodeId);
  }
}
