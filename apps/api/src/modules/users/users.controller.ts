import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Public()
  @Get(':username')
  @ApiOperation({ summary: 'Get public profile by username' })
  getPublicProfile(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }

  @Post('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register FCM push token for this device' })
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fcmToken: string; platform: 'ios' | 'android'; deviceId?: string },
  ) {
    return this.usersService.registerPushToken(
      user.id,
      body.fcmToken,
      body.platform,
      body.deviceId,
    );
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: Partial<{
      episodeDrops: boolean;
      countdownReminders: boolean;
      communityReplies: boolean;
      authorQa: boolean;
      promotions: boolean;
    }>,
  ) {
    return this.usersService.updateNotificationPreferences(user.id, body);
  }
}
