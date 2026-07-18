import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteMessagesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  // Required (must be true) when `ids` is omitted/empty, since that
  // means "delete every message" -- guards against an accidental wipe.
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
