import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import 'reflect-metadata';
import { SwaggerModule } from '@nestjs/swagger';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { load } from 'js-yaml';
import { LoggerService } from './logger/logger.service';
import { AllExceptionsFilter } from './exceptions.filter';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter, logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  try {
    const apiYamlPath = join(process.cwd(), 'doc', 'api.yaml');
    const apiYamlContent = await readFile(apiYamlPath, 'utf8');
    const document = load(apiYamlContent);
    SwaggerModule.setup('doc', app, document as any);
  } catch (e) {
    console.error('Error loading Swagger document', e);
  }

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, err.stack);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  await app.listen(PORT);
}
bootstrap();
