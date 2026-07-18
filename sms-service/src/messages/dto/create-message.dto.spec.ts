import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateMessageDto, payload);
  return validate(dto);
}

describe('CreateMessageDto', () => {
  it('is valid for a well-formed payload', async () => {
    const errors = await validateDto({ to: '+8801700000000', from: 'SMSPit', message: 'Your OTP is 845231' });

    expect(errors).toHaveLength(0);
  });

  it('rejects a missing "to" field', async () => {
    const errors = await validateDto({ from: 'SMSPit', message: 'hi' });

    expect(errors.some((e) => e.property === 'to')).toBe(true);
  });

  it('rejects an empty "message" field', async () => {
    const errors = await validateDto({ to: '+8801700000000', from: 'SMSPit', message: '' });

    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('rejects a "to" value over the max length', async () => {
    const errors = await validateDto({ to: '+'.repeat(33), from: 'SMSPit', message: 'hi' });

    expect(errors.some((e) => e.property === 'to' && e.constraints?.maxLength)).toBe(true);
  });
});
