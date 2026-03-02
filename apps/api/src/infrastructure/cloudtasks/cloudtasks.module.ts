import { Global, Module } from '@nestjs/common';
import { CloudTasksService } from './cloudtasks.service';

@Global()
@Module({
  providers: [CloudTasksService],
  exports: [CloudTasksService],
})
export class CloudTasksModule {}
