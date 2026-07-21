import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message } from './entities/message.entity';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), AuthModule, RealtimeModule, AiModule, QueueModule, MetricsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
