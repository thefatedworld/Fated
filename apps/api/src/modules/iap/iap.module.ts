import { Module } from '@nestjs/common';
import { IAPService } from './iap.service';
import { IAPController } from './iap.controller';
import { TokensModule } from '../tokens/tokens.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [TokensModule, EntitlementsModule],
  controllers: [IAPController],
  providers: [IAPService],
  exports: [IAPService],
})
export class IAPModule {}
