import { IsBoolean } from 'class-validator';

export class UpdateSpamDto {
  @IsBoolean()
  is_spam: boolean;
}
