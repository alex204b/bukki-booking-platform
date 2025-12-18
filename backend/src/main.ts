import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  console.log('🚀 Starting application...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Port:', process.env.PORT);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  // In development, __dirname is dist/src, so we need to go up two levels to reach backend root
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Trust proxy (needed when behind Render/NGINX/Cloudflare) so rate-limit sees real IP
  const httpAdapter = app.getHttpAdapter();
  const expressApp = httpAdapter.getInstance?.();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // Secure headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }) as any);

  // Rate limiting
  // In development, use a much higher limit to avoid blocking during testing
  const isDev = process.env.NODE_ENV !== 'production';
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || (isDev ? '10000' : '300')),
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20'), // tighter for auth endpoints
    standardHeaders: true,
    legacyHeaders: false,
  });
  const verifyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.RATE_LIMIT_VERIFY_MAX || '10'),
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply global limiter
  app.use(globalLimiter);

  // Apply route-specific limiters (helps protect against credential stuffing / OTP abuse)
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);
  app.use('/auth/verify', verifyLimiter);
  app.use('/auth/forgot-password', verifyLimiter);
  app.use('/auth/reset-password', verifyLimiter);

  // Enable CORS with support for multiple allowed origins via env
  const corsEnv = process.env.FRONTEND_URL || process.env.CORS_ALLOWED_ORIGINS;
  const allowedOrigins = (corsEnv ? corsEnv.split(',') : ['http://localhost:3001'])
    .map(o => o.trim())
    .filter(Boolean);

  // For mobile app development, allow requests from any origin (Capacitor apps don't have a traditional origin)
  // In production, you should restrict this to your actual frontend URLs
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: isDevelopment ? true : allowedOrigins, // Allow all origins in development for mobile testing
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MultiBusiness Booking Platform API')
    .setDescription('API for managing bookings across various business types')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://0.0.0.0:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
