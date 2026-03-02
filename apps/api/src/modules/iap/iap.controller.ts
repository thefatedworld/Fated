import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IAPService } from './iap.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('iap')
@Controller('v1/iap')
export class IAPController {
  constructor(private readonly iapService: IAPService) {}

  @Post('apple/validate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Validate Apple StoreKit 2 JWS transaction + credit tokens' })
  validateApple(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { jwsTransaction: string; deviceId?: string },
  ) {
    return this.iapService.validateAppleReceipt(user.id, body.jwsTransaction, body.deviceId);
  }

  @Post('google/validate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Validate Google Play purchase token + credit tokens' })
  validateGoogle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { purchaseToken: string; productId: string },
  ) {
    return this.iapService.validateGooglePurchase(user.id, body.purchaseToken, body.productId);
  }

  @Public()
  @Post('apple/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apple App Store Server Notifications v2 webhook' })
  appleWebhook(@Body() payload: Record<string, unknown>) {
    return this.iapService.handleAppleRefundWebhook(payload);
  }

  @Public()
  @Post('google/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google Play Real-Time Developer Notifications webhook' })
  googleWebhook(@Body() payload: Record<string, unknown>) {
    return this.iapService.handleGoogleRefundWebhook(payload);
  }
}
