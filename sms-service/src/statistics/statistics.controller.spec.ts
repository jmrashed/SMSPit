import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuthClient } from '../auth/auth-client';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: { getStatistics: jest.Mock };

  beforeEach(async () => {
    service = { getStatistics: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        { provide: StatisticsService, useValue: service },
        ApiKeyGuard,
        { provide: AuthClient, useValue: { validateToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(StatisticsController);
  });

  it('returns the aggregated statistics from the service', async () => {
    const stats = { total: 5, by_status: { captured: 4, failed: 1 }, by_day: [{ date: '2026-07-19', count: 5 }] };
    service.getStatistics.mockResolvedValue(stats);

    const result = await controller.getStatistics();

    expect(result).toEqual(stats);
  });
});
