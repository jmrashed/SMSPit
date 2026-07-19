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
