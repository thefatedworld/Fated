import { Controller, Post, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('v1/account')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('data-export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a data export (async — delivered via email)' })
  async requestExport(@CurrentUser() user: AuthenticatedUser) {
    const exportData = await this.complianceService.generateExport(user.id);
    // TODO Phase 2+: Upload to GCS, generate signed URL, send via email notification
    // For now: return data directly (not suitable for production — large payload)
    return { message: 'Export generated', data: exportData };
  }

  @Delete('deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate account (soft delete)' })
  deactivate(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceService.deactivateAccount(user.id);
  }
}
