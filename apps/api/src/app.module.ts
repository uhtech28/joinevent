import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { loadEnv } from './env';
import { StorageModule } from './storage/storage.module';
import { CacheModule } from './cache/cache.module';
import { ObservabilityModule } from './observability/observability.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { BusinessProfilesModule } from './business-profiles/business-profiles.module';
import { SocietiesModule } from './societies/societies.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FollowersModule } from './followers/followers.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeaturedModule } from './featured/featured.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { KycModule } from './kyc/kyc.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SocietyPostsModule } from './society-posts/society-posts.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { QueueModule } from './queue/queue.module';
import { PostsModule } from './posts/posts.module';
import { ProductsModule } from './products/products.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { UploadsModule } from './uploads/uploads.module';
import { ApplicationsModule } from './applications/applications.module';

const env = loadEnv();

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { ttl: env.THROTTLE_TTL_SECONDS * 1000, limit: env.THROTTLE_LIMIT },
    ]),
    StorageModule,
    CacheModule,
    ObservabilityModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    EventsModule,
    AuthModule,
    FollowersModule,
    NotificationsModule,
    FeaturedModule,
    BusinessProfilesModule,
    SocietiesModule,
    WalletModule,
    PaymentsModule,
    BookingsModule,
    ReviewsModule,
    AdminModule,
    WithdrawalsModule,
    KycModule,
    SubscriptionsModule,
    SocietyPostsModule,
    RecommendationsModule,
    QueueModule,
    PostsModule,
    ProductsModule,
    EnquiriesModule,
    UploadsModule,
    ApplicationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
