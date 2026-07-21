import { Module } from '@nestjs/common';
import { QueuePublisher } from './queue-publisher';

@Module({
  providers: [QueuePublisher],
  exports: [QueuePublisher],
})
export class QueueModule {}
