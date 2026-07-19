import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StatisticsService } from './statistics.service';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('statistics')
@UseGuards(ApiKeyGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(@Req() request: Request): Promise<StatisticsResponseDto> {
    return this.statisticsService.getStatistics(request.apiKey!.org_id);
  }
}
