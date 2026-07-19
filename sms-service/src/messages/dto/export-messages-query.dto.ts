import 'reflect-metadata';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class ExportMessagesQueryDto {
  @IsOptional()
  @IsIn(['csv', 'json'])
  format: 'csv' | 'json' = 'json';

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsISO8601()
  created_after?: string;

  @IsOptional()
  @IsISO8601()
  created_before?: string;
}
