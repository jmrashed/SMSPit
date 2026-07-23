import type { Request, Response } from 'express';
import { metricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

describe('metricsMiddleware', () => {
  it('records request count and duration on response finish, using the matched route pattern', () => {
    const metrics = new MetricsService();
    jest.spyOn(metrics.httpRequestsTotal, 'inc');
    jest.spyOn(metrics.httpRequestDuration, 'observe');

    const middleware = metricsMiddleware(metrics);
    const listeners: Record<string, () => void> = {};
    const req = { method: 'GET', route: { path: '/messages/:id' } } as unknown as Request;
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
    } as unknown as Response;
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    listeners.finish();

    expect(metrics.httpRequestsTotal.inc).toHaveBeenCalledWith({ method: 'GET', route: '/messages/:id', status: '200' });
    expect(metrics.httpRequestDuration.observe).toHaveBeenCalledWith({ method: 'GET', route: '/messages/:id' }, expect.any(Number));
  });

  it('falls back to "unmatched" when routing never populated req.route (e.g. a 404)', () => {
    const metrics = new MetricsService();
    jest.spyOn(metrics.httpRequestsTotal, 'inc');

    const middleware = metricsMiddleware(metrics);
    const listeners: Record<string, () => void> = {};
    const req = { method: 'GET', route: undefined } as unknown as Request;
    const res = {
      statusCode: 404,
      on: jest.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
    } as unknown as Response;

    middleware(req, res, jest.fn());
    listeners.finish();

    expect(metrics.httpRequestsTotal.inc).toHaveBeenCalledWith({ method: 'GET', route: 'unmatched', status: '404' });
  });
});
