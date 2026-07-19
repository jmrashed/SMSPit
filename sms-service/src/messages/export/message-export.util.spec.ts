import { csvHeaderRow, csvRow, toExportRecord } from './message-export.util';
import { Message, MessageStatus } from '../entities/message.entity';

describe('message-export.util', () => {
  it('maps an entity to the flat export record shape', () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      orgId: 42,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };

    expect(toExportRecord(entity)).toEqual({
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
      status: 'captured',
      replayed_from: null,
      created_at: '2026-07-19T00:00:00.000Z',
    });
  });

  it('writes the CSV header row in a fixed column order', () => {
    expect(csvHeaderRow()).toBe('id,to,from,message,status,replayed_from,created_at\n');
  });

  it('writes a plain field without quoting', () => {
    const row = csvRow({
      id: 'sms_1',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'hello',
      status: 'captured',
      replayed_from: null,
      created_at: '2026-07-19T00:00:00.000Z',
    });

    expect(row).toBe('sms_1,+8801700000000,SMSPit,hello,captured,,2026-07-19T00:00:00.000Z\n');
  });

  it('quotes and escapes a field containing a comma, quote, or newline', () => {
    const row = csvRow({
      id: 'sms_2',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Hi "friend", see you\ntomorrow',
      status: 'captured',
      replayed_from: null,
      created_at: '2026-07-19T00:00:00.000Z',
    });

    expect(row).toBe('sms_2,+8801700000000,SMSPit,"Hi ""friend"", see you\ntomorrow",captured,,2026-07-19T00:00:00.000Z\n');
  });

  it('quotes a replayed_from value the same way as any other field', () => {
    const row = csvRow({
      id: 'sms_3',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'hi',
      status: 'captured',
      replayed_from: 'sms_original',
      created_at: '2026-07-19T00:00:00.000Z',
    });

    expect(row).toBe('sms_3,+8801700000000,SMSPit,hi,captured,sms_original,2026-07-19T00:00:00.000Z\n');
  });
});
