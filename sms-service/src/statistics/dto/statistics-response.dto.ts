export class DailyCountDto {
  date: string;
  count: number;
}

export class StatisticsResponseDto {
  total: number;
  by_status: Record<string, number>;
  by_day: DailyCountDto[];
}
