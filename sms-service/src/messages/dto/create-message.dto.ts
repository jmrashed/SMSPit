import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  from: string;

  // REST field is `message`, mapped to the entity's `body` column --
  // see docs/api/message-mapping.md for why the names differ.
  @IsString()
  @IsNotEmpty()
  @MaxLength(1600)
  message: string;
}
