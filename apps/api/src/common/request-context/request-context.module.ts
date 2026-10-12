import { Global, Module } from '@nestjs/common';
import { CorrelationIdMiddleware } from './correlation-id.middleware.js';

@Global()
@Module({
  exports: [CorrelationIdMiddleware],
  providers: [CorrelationIdMiddleware],
})
export class RequestContextModule {}
