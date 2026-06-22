import { Module } from '@nestjs/common';
import { SocietyPostsController } from './society-posts.controller';
import { SocietyPostsService } from './society-posts.service';

@Module({
  controllers: [SocietyPostsController],
  providers: [SocietyPostsService],
})
export class SocietyPostsModule {}
