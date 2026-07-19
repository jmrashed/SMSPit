import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../messages/entities/message.entity';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let queryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    groupBy: jest.Mock;
    orderBy: jest.Mock;
    getRawMany: jest.Mock;
  };
  let repository: { count: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    repository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticsService, { provide: getRepositoryToken(Message), useValue: repository }],
    }).compile();

    service = module.get(StatisticsService);
  });

  it('aggregates total, by_status, and by_day counts scoped to the acting org', async () => {
    repository.count.mockResolvedValue(5);
    queryBuilder.getRawMany
      .mockResolvedValueOnce([
        { status: 'captured', count: '4' },
        { status: 'failed', count: '1' },
      ])
      .mockResolvedValueOnce([
        { date: '2026-07-18', count: '2' },
        { date: '2026-07-19', count: '3' },
      ]);

    const result = await service.getStatistics(42);

    expect(repository.count).toHaveBeenCalledWith({ where: { orgId: 42 } });
    expect(queryBuilder.where).toHaveBeenCalledWith('m.org_id = :orgId', { orgId: 42 });
    expect(result).toEqual({
      total: 5,
      by_status: { captured: 4, failed: 1 },
      by_day: [
        { date: '2026-07-18', count: 2 },
        { date: '2026-07-19', count: 3 },
      ],
    });
  });

  it('scopes to a null org_id ("ungrouped") using IS NULL, not = NULL', async () => {
    repository.count.mockResolvedValue(0);
    queryBuilder.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await service.getStatistics(null);

    expect(queryBuilder.where).toHaveBeenCalledWith('m.org_id IS NULL', {});
  });

  it('returns empty aggregates when there are no messages', async () => {
    repository.count.mockResolvedValue(0);
    queryBuilder.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.getStatistics(42);

    expect(result).toEqual({ total: 0, by_status: {}, by_day: [] });
  });
});
