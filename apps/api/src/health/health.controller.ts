import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'api';
  version: string;
  database: 'up' | 'down';
  timestamp: string;
};

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const database = await this.prisma.checkConnection();

    return {
      status: database ? 'ok' : 'degraded',
      service: 'api',
      version: 'v1',
      database: database ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
