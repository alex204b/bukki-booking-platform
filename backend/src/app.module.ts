import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { BookingsModule } from './bookings/bookings.module';
import { ServicesModule } from './services/services.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MessagesModule } from './messages/messages.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { CustomersModule } from './customers/customers.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CalendarModule } from './calendar/calendar.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { FavoritesModule } from './favorites/favorites.module';
import { OffersModule } from './offers/offers.module';
import { AIModule } from './ai/ai.module';
import { RequestsModule } from './requests/requests.module';
import { ResourcesModule } from './resources/resources.module';
import { ChatModule } from './chat/chat.module';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Explicitly specify .env file path
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot((() => {
      const dbUrl = process.env.DATABASE_URL;

      // If DATABASE_URL is set, use cloud database
      if (dbUrl) {
        // Extract host from URL for logging (without credentials)
        let dbHost = 'unknown';
        try {
          const urlObj = new URL(dbUrl);
          dbHost = urlObj.hostname;
        } catch (e) {
          dbHost = 'unknown';
        }

        console.log('☁️  Database Configuration (CLOUD):');
        console.log('  ✅ Using Neon.tech cloud database');
        console.log('  ✅ Hostname:', dbHost);
        console.log('  ✅ SSL enabled: true');
        console.log('  ✅ Synchronize: false (migrations only)');

        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: false,
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            // Connection pool settings for cloud database
            max: 20, // Maximum number of connections in pool
            min: 2, // Minimum number of connections in pool
            idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
            connectionTimeoutMillis: 10000, // Timeout for new connections (10 seconds)
            // SSL/TLS settings
            ssl: {
              rejectUnauthorized: false,
            },
          },
          logging: false,
          retryAttempts: 3,
          retryDelay: 3000,
        };
      }

      // Otherwise, use local database settings
      console.log('🏠 Database Configuration (LOCAL):');
      console.log('  ✅ Using local PostgreSQL database');
      console.log('  ✅ Host:', process.env.DATABASE_HOST || 'localhost');
      console.log('  ✅ Port:', process.env.DATABASE_PORT || '5432');
      console.log('  ✅ Database:', process.env.DATABASE_NAME || 'booking_platform');
      console.log('  ✅ Synchronize: true (auto-sync schema)');

      return {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'booking_platform',
        autoLoadEntities: true,
        synchronize: true, // Auto-sync for local development
        logging: false,
      };
    })()),
    AuthModule,
    UsersModule,
    BusinessesModule,
    BookingsModule,
    ServicesModule,
    AnalyticsModule,
    NotificationsModule,
    PaymentsModule,
    FilesModule,
    ReviewsModule,
    ReportsModule,
    FeedbackModule,
    MessagesModule,
    WaitlistModule,
    CustomersModule,
    LoyaltyModule,
    CalendarModule,
    AdminModule,
    AuditModule,
    FavoritesModule,
    OffersModule,
    AIModule,
    RequestsModule,
    ResourcesModule,
    RedisModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
