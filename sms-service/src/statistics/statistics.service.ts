import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
import { StatisticsResponseDto } from './dto/statistics-response.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  // No caching layer here: v0.1's data volume (a local dev/test sandbox,
  // not production traffic) doesn't justify one -- see
  // docs/redis.md#caching-strategy-for-v01.
  async getStatistics(): Promise<StatisticsResponseDto> {
    const total = await this.messagesRepository.count();

    const byStatusRows: { status: string; count: string }[] = await this.messagesRepository
      .createQueryBuilder('m')
      .select('m.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.status')
      .getRawMany();

    // Cast to text (not just DATE()) so node-postgres returns a plain
    // "YYYY-MM-DD" string instead of parsing it into a JS Date, which
    // would re-serialize shifted by the server's local timezone.
    const byDayRows: { date: string; count: string }[] = await this.messagesRepository
      .createQueryBuilder('m')
      .select("TO_CHAR(m.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(m.createdAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(m.createdAt, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    const by_status: Record<string, number> = {};
    for (const row of byStatusRows) {
      by_status[row.status] = Number(row.count);
    }

    const by_day = byDayRows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    return { total, by_status, by_day };
  }
}
