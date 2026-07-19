import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { AuthClient, ValidatedApiKey } from './auth-client';

function createContext(headers: Record<string, string>) {
  const request: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  let authClient: { validateToken: jest.Mock };
  let guard: ApiKeyGuard;

  beforeEach(() => {
    authClient = { validateToken: jest.fn() };
    guard = new ApiKeyGuard(authClient as unknown as AuthClient);
  });

  it('rejects a request with no Authorization header', async () => {
    const context = createContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(authClient.validateToken).not.toHaveBeenCalled();
  });

  it('rejects a request when auth-service says the key is invalid', async () => {
    authClient.validateToken.mockResolvedValue(null);
    const context = createContext({ authorization: 'Bearer sms_live_bad.secret' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('allows a request with a valid key and attaches it to the request', async () => {
    const apiKey: ValidatedApiKey = { id: 1, name: 'test', owner_id: 1, org_id: null, scopes: [] };
    authClient.validateToken.mockResolvedValue(apiKey);
    const request: any = { headers: { authorization: 'Bearer sms_live_ok.secret' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.apiKey).toBe(apiKey);
    expect(authClient.validateToken).toHaveBeenCalledWith('Bearer sms_live_ok.secret');
  });
});
