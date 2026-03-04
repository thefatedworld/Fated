import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';
import { InternalRequestGuard } from '../../common/guards/internal-request.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiExcludeController()
@Public()
@UseGuards(InternalRequestGuard)
@Controller('v1/internal/distribution')
export class DistributionInternalController {
  constructor(private readonly distributionService: DistributionService) {}

  @Post('process/:jobId')
  processJob(@Param('jobId') jobId: string) {
    return this.distributionService.processJob(jobId);
  }
}
