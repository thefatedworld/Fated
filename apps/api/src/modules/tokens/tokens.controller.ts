import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('tokens')
@ApiBearerAuth()
@Controller('v1/tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get my token balance' })
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    const balance = await this.tokensService.getBalance(user.id);
    return { balance: balance.toString() };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my token transaction history' })
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.tokensService.getLedgerHistory(
      user.id,
      limit ? parseInt(limit, 10) : 50,
      cursor,
    );
  }
}
