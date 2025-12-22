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
      const dbUrl = process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USERNAME || 'postgres'}:${process.env.DATABASE_PASSWORD || 'password'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'booking_platform'}`;
      const useSSL = process.env.DATABASE_URL ? { rejectUnauthorized: false } : false;

      // Extract host from URL for logging (without credentials)
      let dbHost = 'unknown';
      try {
        const urlObj = new URL(dbUrl);
        dbHost = urlObj.hostname;
      } catch (e) {
        dbHost = 'localhost';
      }

      console.log('🔍 Database Configuration:');
      console.log('  DATABASE_URL set:', !!process.env.DATABASE_URL);
      console.log('  Database host:', dbUrl.includes('neon.tech') ? 'Neon Cloud ☁️' : 'localhost 💻');
      console.log('  Actual hostname:', dbHost);
      console.log('  SSL enabled:', !!useSSL);
      console.log('  Connection URL preview:', dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 30));

      return {
        type: 'postgres',
        url: dbUrl,
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV === 'development',
        ssl: useSSL,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
