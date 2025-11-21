import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Run migrations
  const dataSource = app.get(DataSource);
  try {
    logger.log('Checking database migrations...');

    // Get pending migrations before running
    const pendingMigrations = await dataSource.showMigrations();

    if (!pendingMigrations) {
      logger.log('All migrations are up to date');
    } else {
      logger.log('Found pending migrations, executing...');
      const migrations = await dataSource.runMigrations({ transaction: 'all' });

      if (migrations.length > 0) {
        logger.log(`Successfully executed ${migrations.length} migration(s):`);
        migrations.forEach((migration) => {
          logger.log(`  ✓ ${migration.name}`);
        });
      }
    }
  } catch (error) {
    logger.error('Failed to run migrations:', error.message);
    throw error;
  }

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable serialization to exclude sensitive fields like passwords
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Enable CORS if needed
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
