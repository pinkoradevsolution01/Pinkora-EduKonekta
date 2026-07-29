import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports a healthy API when PostgreSQL is reachable', async () => {
    const controller = new HealthController({
      checkConnection: jest.fn().mockResolvedValue(true),
    } as never);

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'ok',
      service: 'api',
      version: 'v1',
      database: 'up',
    });
  });

  it('reports degraded status when PostgreSQL is unavailable', async () => {
    const controller = new HealthController({
      checkConnection: jest.fn().mockResolvedValue(false),
    } as never);

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      database: 'down',
    });
  });
});
