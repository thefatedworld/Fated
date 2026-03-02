import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { InternalRequestGuard } from '../../common/guards/internal-request.guard';

@ApiExcludeController()
@UseGuards(InternalRequestGuard)
@Controller('v1/internal/notifications')
export class NotificationsInternalController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('episode-countdown')
  handleEpisodeCountdown(@Body() body: { episodeId: string; type: 'countdown_24h' | 'countdown_1h' }) {
    return this.notificationsService.handleEpisodeCountdown(body.episodeId, body.type);
  }

  @Post('episode-drop')
  handleEpisodeDrop(@Body() body: { episodeId: string; seriesId: string }) {
    return this.notificationsService.handleEpisodeDrop(body.episodeId, body.seriesId);
  }
}
