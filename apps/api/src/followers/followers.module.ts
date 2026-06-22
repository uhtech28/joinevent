import { Global, Module } from '@nestjs/common';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';

// Global so BusinessProfilesService can inject isFollowing() without circular imports.
@Global()
@Module({
  controllers: [FollowersController],
  providers: [FollowersService],
  exports: [FollowersService],
})
export class FollowersModule {}
