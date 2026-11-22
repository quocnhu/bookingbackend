import { Global, Module } from '@nestjs/common';
import { DispatchPolicyService } from './dispatch-policy.service';

@Global()
@Module({
  providers: [DispatchPolicyService],
  exports: [DispatchPolicyService],
})
export class DispatchPolicyModule {}
