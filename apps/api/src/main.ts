import 'reflect-metadata';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLogger } from './common/logging/logger';
import { securityMiddleware } from './common/security/http-security';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new StructuredLogger();

  app.useLogger(logger);
  app.setGlobalPrefix(config.getOrThrow<string>('API_PREFIX'));
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN'), credentials: true });
  // Attachments are capped at 10 MB; their JSON-safe base64 transport needs headroom.
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  app.use(securityMiddleware(config.getOrThrow<string>('CORS_ORIGIN')));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
