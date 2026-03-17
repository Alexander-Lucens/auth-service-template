import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'reflect-metadata';
import { SwaggerModule } from '@nestjs/swagger';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { load } from 'js-yaml';
import helmet from 'helmet';
import { LoggerService } from './logger/logger.service';
import { AllExceptionsFilter } from './exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter, logger));

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  try {
    const apiYamlPath = join(process.cwd(), 'doc', 'api.yaml');
    const apiYamlContent = await readFile(apiYamlPath, 'utf8');
    const document = load(apiYamlContent);
    SwaggerModule.setup('doc', app, document as any);
  } catch (e) {
    logger.error('Error loading Swagger document', (e as Error).stack);
  }

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, err.stack);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();

