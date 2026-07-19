import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { MessageBirdController } from './messagebird/messagebird.controller';

@Module({
  imports: [MessagesModule],
  controllers: [MessageBirdController],
})
export class ProvidersModule {}
