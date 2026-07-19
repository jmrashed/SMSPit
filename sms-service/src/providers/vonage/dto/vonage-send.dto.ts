import { IsNotEmpty, IsString } from 'class-validator';

// Mirrors Vonage's (classic Nexmo) POST /sms/json request body -- field
// names match Vonage's API exactly, not SMSPit's own naming. api_key/
// api_secret are accepted (so requests aren't rejected for shape reasons)
// but never validated -- see
// docs/api/provider-compatibility.md#vonage-nexmo-classic-sms-api--post-providersvonagesmsjson.
export class VonageSendDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
