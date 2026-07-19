import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MessagesService } from '../../messages/messages.service';
import { VonageSendDto } from './dto/vonage-send.dto';

// Real endpoint: POST https://rest.nexmo.com/sms/json (form-encoded or
// JSON; Nest's default body parsers accept either) -- see
// docs/api/provider-compatibility.md#vonage-nexmo-classic-sms-api--post-providersvonagesmsjson
@Controller('providers/vonage')
export class VonageController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('sms/json')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: VonageSendDto) {
    const message = await this.messagesService.create(
      {
        to: dto.to,
        from: dto.from,
        message: dto.text,
      },
      null,
    );

    // status "0" is Vonage's own success code -- SDKs branch on it.
    return {
      'message-count': '1',
      messages: [{ to: message.to, 'message-id': message.id, status: '0' }],
    };
  }
}
