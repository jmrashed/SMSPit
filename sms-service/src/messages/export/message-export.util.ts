import { Message } from '../entities/message.entity';

export const CSV_COLUMNS = ['id', 'to', 'from', 'message', 'status', 'replayed_from', 'created_at'] as const;

export interface ExportRecord {
  id: string;
  to: string;
  from: string;
  message: string;
  status: string;
  replayed_from: string | null;
  created_at: string;
}

export function toExportRecord(entity: Message): ExportRecord {
  return {
    id: entity.id,
    to: entity.to,
    from: entity.from,
    message: entity.body,
    status: entity.status,
    replayed_from: entity.replayedFrom,
    created_at: entity.createdAt.toISOString(),
  };
}

// RFC 4180: a field containing a comma, quote, or newline must be
// quoted, and any quote inside it doubled.
function escapeCsvField(value: string | null): string {
  if (value === null) return '';
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvHeaderRow(): string {
  return CSV_COLUMNS.join(',') + '\n';
}

export function csvRow(record: ExportRecord): string {
  return CSV_COLUMNS.map((column) => escapeCsvField(record[column])).join(',') + '\n';
}
