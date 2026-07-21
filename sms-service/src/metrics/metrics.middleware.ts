import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

// Records httpRequestsTotal/httpRequestDuration for every request.
// Reads req.route.path (the matched Express pattern, e.g.
// "/messages/:id", not the raw "/messages/sms_abc123") from the
// response's "finish" event -- by then routing has completed and
// req.route is populated, which isn't true yet when this middleware
// itself runs (Express middleware executes before routing).
export function metricsMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const route = (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;

      metrics.httpRequestsTotal.inc({ method: req.method, route, status: String(res.statusCode) });
      metrics.httpRequestDuration.observe({ method: req.method, route }, durationSeconds);
    });

    next();
  };
}
