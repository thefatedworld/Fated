import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { InternalRequestGuard } from '../../common/guards/internal-request.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiExcludeController()
@ApiTags('internal')
@Public()
@UseGuards(InternalRequestGuard)
@Controller('v1/internal')
export class ContentInternalController {
  constructor(private readonly contentService: ContentService) {}

  @Post('episodes/:id/publish')
  @ApiOperation({ summary: '[Internal] Cloud Tasks callback — scheduled episode publish' })
  handleScheduledPublish(@Param('id') id: string) {
    return this.contentService.handleScheduledPublish(id);
  }
}
