import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListMessagesQueryDto } from './list-messages-query.dto';

async function validateQuery(query: Record<string, unknown>) {
  const dto = plainToInstance(ListMessagesQueryDto, query);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ListMessagesQueryDto', () => {
  it('defaults to limit=20, offset=0 when omitted', async () => {
    const { dto, errors } = await validateQuery({});

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(20);
    expect(dto.offset).toBe(0);
  });

  it('accepts limit at the boundaries (1 and 100)', async () => {
    expect((await validateQuery({ limit: '1' })).errors).toHaveLength(0);
    expect((await validateQuery({ limit: '100' })).errors).toHaveLength(0);
  });

  it('rejects limit below 1 or above 100', async () => {
    expect((await validateQuery({ limit: '0' })).errors.length).toBeGreaterThan(0);
    expect((await validateQuery({ limit: '101' })).errors.length).toBeGreaterThan(0);
  });

  it('rejects a negative offset', async () => {
    const { errors } = await validateQuery({ offset: '-1' });

    expect(errors.some((e) => e.property === 'offset')).toBe(true);
  });

  it('accepts offset=0 and coerces numeric strings', async () => {
    const { dto, errors } = await validateQuery({ limit: '50', offset: '10' });

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(50);
    expect(dto.offset).toBe(10);
  });
});
