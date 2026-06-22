import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class FollowersController {
  constructor(private readonly followers: FollowersService) {}

  // POST /business-profiles/:username/follow
  @UseGuards(JwtAuthGuard)
  @Post('business-profiles/:username/follow')
  @HttpCode(200)
  follow(@CurrentUser() user: { id: string }, @Param('username') username: string) {
    return this.followers.follow(user.id, username);
  }

  // DELETE /business-profiles/:username/follow
  @UseGuards(JwtAuthGuard)
  @Delete('business-profiles/:username/follow')
  @HttpCode(200)
  unfollow(@CurrentUser() user: { id: string }, @Param('username') username: string) {
    return this.followers.unfollow(user.id, username);
  }

  // GET /following
  @UseGuards(JwtAuthGuard)
  @Get('following')
  mine(@CurrentUser() user: { id: string }) {
    return this.followers.listFollowing(user.id);
  }
}
