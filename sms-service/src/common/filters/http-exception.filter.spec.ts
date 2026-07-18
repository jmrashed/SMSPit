import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createMockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('formats a plain HttpException as { code, message, details: null }', () => {
    const { host, status, json } = createMockHost();

    filter.catch(new NotFoundException('Message sms_missing not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      code: 'NOT_FOUND',
      message: 'Message sms_missing not found',
      details: null,
    });
  });

  it('collects class-validator array messages into details', () => {
    const { host, status, json } = createMockHost();

    filter.catch(new BadRequestException(['to should not be empty', 'to must be a string']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      details: ['to should not be empty', 'to must be a string'],
    });
  });

  it('masks unexpected errors as a generic 500', () => {
    const { host, status, json } = createMockHost();

    filter.catch(new Error('some internal secret detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: null,
    });
  });
});
