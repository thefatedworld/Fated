import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsInternalController } from './notifications-internal.controller';

@Module({
  controllers: [NotificationsInternalController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
