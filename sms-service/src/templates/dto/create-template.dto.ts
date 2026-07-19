import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  // {{variable}} placeholders, e.g. "Your OTP is {{otp}}".
  @IsString()
  @IsNotEmpty()
  @MaxLength(1600)
  body: string;

  // Declares which placeholders the template expects, so a consumer
  // (Day 62's picker UI) can render an input for each without parsing
  // the body itself.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
