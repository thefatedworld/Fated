import { Module } from '@nestjs/common';
import { ExperimentationService } from './experimentation.service';

@Module({
  providers: [ExperimentationService],
  exports: [ExperimentationService],
})
export class ExperimentationModule {}
