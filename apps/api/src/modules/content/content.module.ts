import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentInternalController } from './content-internal.controller';

@Module({
  controllers: [ContentController, ContentInternalController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
