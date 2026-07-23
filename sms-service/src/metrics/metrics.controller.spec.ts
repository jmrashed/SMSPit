import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metrics: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    controller = module.get(MetricsController);
    metrics = module.get(MetricsService);
  });

  it('writes the Prometheus content type and the registry body', async () => {
    metrics.httpRequestsTotal.inc({ method: 'GET', route: '/messages', status: '200' });

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await controller.getMetrics(res as never);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', metrics.registry.contentType);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('sms_service_http_requests_total'));
  });
});
