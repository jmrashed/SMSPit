import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MessagesService } from '../../messages/messages.service';
import { MessageBirdSendDto } from './dto/messagebird-send.dto';
import { firstRecipient } from '../recipient.util';

// Real endpoint: POST https://rest.messagebird.com/messages -- see
// docs/api/provider-compatibility.md#messagebird--post-providersmessagebirdmessages
@Controller('providers/messagebird')
export class MessageBirdController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async send(@Body() dto: MessageBirdSendDto) {
    const to = firstRecipient(dto.recipients);
    const message = await this.messagesService.create({
      to,
      from: dto.originator,
      message: dto.body,
    });

    return {
      id: message.id,
      originator: message.from,
      body: message.body,
      recipients: {
        totalCount: 1,
        totalSentCount: 1,
        items: [{ recipient: to, status: 'sent' }],
      },
      createdDatetime: message.createdAt.toISOString(),
    };
  }
}
