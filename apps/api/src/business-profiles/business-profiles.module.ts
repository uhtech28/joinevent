import { Module } from '@nestjs/common';
import { BusinessProfilesController } from './business-profiles.controller';
import { BusinessProfilesService } from './business-profiles.service';
import { EventsModule } from '../events/events.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [EventsModule, ReviewsModule],
  controllers: [BusinessProfilesController],
  providers: [BusinessProfilesService],
  exports: [BusinessProfilesService],
})
export class BusinessProfilesModule {}
