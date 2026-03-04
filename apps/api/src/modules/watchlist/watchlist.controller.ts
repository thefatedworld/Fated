import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('watchlist')
@ApiBearerAuth()
@Controller('v1/watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get my watchlist (saved series)' })
  getWatchlist(@CurrentUser() user: AuthenticatedUser) {
    return this.watchlistService.getWatchlist(user.id);
  }

  @Get(':seriesId/check')
  @ApiOperation({ summary: 'Check if series is on my watchlist' })
  checkWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId') seriesId: string,
  ) {
    return this.watchlistService.isOnWatchlist(user.id, seriesId);
  }

  @Post(':seriesId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add series to my watchlist' })
  addToWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId') seriesId: string,
  ) {
    return this.watchlistService.addToWatchlist(user.id, seriesId);
  }

  @Delete(':seriesId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove series from my watchlist' })
  removeFromWatchlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId') seriesId: string,
  ) {
    return this.watchlistService.removeFromWatchlist(user.id, seriesId);
  }
}
