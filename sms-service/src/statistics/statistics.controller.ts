import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsResponseDto } from './dto/statistics-response.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('statistics')
@UseGuards(ApiKeyGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(): Promise<StatisticsResponseDto> {
    return this.statisticsService.getStatistics();
  }
}
