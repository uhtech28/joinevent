import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { SearchService } from './search.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, SearchService],
  exports: [EventsService, SearchService],
})
export class EventsModule {}
