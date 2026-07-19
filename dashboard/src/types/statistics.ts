export interface DailyCount {
  date: string;
  count: number;
}

export interface Statistics {
  total: number;
  by_status: Record<string, number>;
  by_day: DailyCount[];
}
