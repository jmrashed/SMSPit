import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { MessageBirdController } from './messagebird/messagebird.controller';
import { VonageController } from './vonage/vonage.controller';
import { SnsController } from './sns/sns.controller';

@Module({
  imports: [MessagesModule],
  controllers: [MessageBirdController, VonageController, SnsController],
})
export class ProvidersModule {}
