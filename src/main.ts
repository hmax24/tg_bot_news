import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app: INestApplication =
      await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: unknown): void => {
  const message: string = error instanceof Error
      ? error.message
      : 'Application startup failed';

  console.error(message);
  process.exitCode = 1;
});