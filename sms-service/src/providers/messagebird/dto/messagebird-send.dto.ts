import { IsNotEmpty, IsString } from 'class-validator';

// Mirrors MessageBird's POST /messages request body -- field names match
// MessageBird's API exactly, not SMSPit's own naming (see
// docs/api/provider-compatibility.md#messagebird--post-providersmessagebirdmessages).
export class MessageBirdSendDto {
  @IsString()
  @IsNotEmpty()
  originator: string;

  @IsNotEmpty()
  recipients: string | string[];

  @IsString()
  @IsNotEmpty()
  body: string;
}
