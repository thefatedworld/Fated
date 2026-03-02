import { Module } from '@nestjs/common';
import { DistributionService } from './distribution.service';
import { DistributionController } from './distribution.controller';
import { DistributionInternalController } from './distribution-internal.controller';

@Module({
  controllers: [DistributionController, DistributionInternalController],
  providers: [DistributionService],
  exports: [DistributionService],
})
export class DistributionModule {}
