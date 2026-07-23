import { Controller, Post, Req, Res } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { MessagesService } from '../../messages/messages.service';
import { escapeXml } from './xml.util';

// Real endpoint: a regional AWS SNS endpoint, AWS Query API (form-encoded,
// Action=Publish), SigV4-signed -- see
// docs/api/provider-compatibility.md#aws-sns--post-providerssns
//
// Response is XML (AWS's default and what the SDK's parser expects), not
// this app's usual JSON error envelope, so this controller writes the
// response manually rather than returning a value for Nest to serialize.
@Controller('providers/sns')
export class SnsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async publish(@Req() req: Request, @Res() res: Response): Promise<void> {
    const body = req.body as Record<string, string>;

    if (body.Action !== 'Publish') {
      this.sendError(res, 400, 'InvalidAction', 'This adapter only supports the Publish action.');
      return;
    }

    if (body.TopicArn) {
      this.sendError(
        res,
        400,
        'InvalidParameter',
        'Topic-based Publish is not supported; use PhoneNumber for a direct-to-phone send.',
      );
      return;
    }

    if (!body.PhoneNumber || !body.Message) {
      this.sendError(res, 400, 'InvalidParameter', 'PhoneNumber and Message are required.');
      return;
    }

    // The AWS Query API is form-encoded key=value, not JSON, so this
    // controller reads req.body directly rather than through a DTO +
    // Nest's ValidationPipe (which would also emit its own JSON error
    // shape, breaking the XML error contract this adapter mimics). These
    // checks mirror CreateMessageDto's constraints (sms-service/src/messages/dto/create-message.dto.ts)
    // by hand instead.
    if (typeof body.PhoneNumber !== 'string' || typeof body.Message !== 'string') {
      this.sendError(res, 400, 'InvalidParameter', 'PhoneNumber and Message must be single string values.');
      return;
    }

    if (body.PhoneNumber.length > 32) {
      this.sendError(res, 400, 'InvalidParameter', 'PhoneNumber must not exceed 32 characters.');
      return;
    }

    if (body.Message.length > 1600) {
      this.sendError(res, 400, 'InvalidParameter', 'Message must not exceed 1600 characters.');
      return;
    }

    // SNS has no per-message sender field (SMSSenderID is account-level,
    // set outside the Publish call) -- default to SMSPit like other
    // adapters do when the source format has no equivalent field.
    const message = await this.messagesService.create(
      {
        to: body.PhoneNumber,
        from: 'SMSPit',
        message: body.Message,
      },
      null,
    );

    res.status(200);
    res.set('Content-Type', 'text/xml');
    res.send(
      `<PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">` +
        `<PublishResult><MessageId>${escapeXml(message.id)}</MessageId></PublishResult>` +
        `<ResponseMetadata><RequestId>${randomUUID()}</RequestId></ResponseMetadata>` +
        `</PublishResponse>`,
    );
  }

  private sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status);
    res.set('Content-Type', 'text/xml');
    res.send(
      `<ErrorResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">` +
        `<Error><Type>Sender</Type><Code>${escapeXml(code)}</Code><Message>${escapeXml(message)}</Message></Error>` +
        `<RequestId>${randomUUID()}</RequestId>` +
        `</ErrorResponse>`,
    );
  }
}
