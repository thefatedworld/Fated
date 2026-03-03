import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));

  // CORS — allow only known origins in prod
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://admin.fatedworld.com',
        ...(process.env.ADMIN_ORIGIN ? [process.env.ADMIN_ORIGIN] : []),
      ]
    : ['http://localhost:3001', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,          // Auto-transform plain objects to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // OpenAPI spec (internal only — not exposed in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FatedWorld API')
      .setDescription('FatedWorld streaming platform API — internal documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health')
      .addTag('auth')
      .addTag('users')
      .addTag('content')
      .addTag('video')
      .addTag('tokens')
      .addTag('entitlements')
      .addTag('iap')
      .addTag('community')
      .addTag('wiki')
      .addTag('moderation')
      .addTag('analytics')
      .addTag('recommendations')
      .addTag('distribution')
      .addTag('compliance')
      .addTag('admin')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log('OpenAPI spec available at /api/docs');
  }

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`FatedWorld API running on port ${port}`);
  logger.log(`Environment: ${process.env.ENVIRONMENT ?? 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
