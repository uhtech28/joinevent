import { Controller, Get, Param } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller()
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  // GET /events/:slug/recommendations — "You may also like"
  @Get('events/:slug/recommendations')
  forEvent(@Param('slug') slug: string) {
    return this.recs.forEvent(slug);
  }
}
