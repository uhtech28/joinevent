import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import {
  createCommentSchema,
  createPostSchema,
  type PublicComment,
  type PublicPost,
} from './dto/post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // POST /posts — create a post as my business profile
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicPost> {
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.posts.create(user.id, parsed.data);
  }

  // GET /posts/feed — follower feed (auth required)
  @UseGuards(JwtAuthGuard)
  @Get('feed')
  feed(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.feed(user.id, cursor, limit ? Number(limit) : 20);
  }

  // GET /posts/profile/:username — public profile timeline
  @UseGuards(OptionalJwtAuthGuard)
  @Get('profile/:username')
  byProfile(
    @Param('username') username: string,
    @CurrentUser() viewer: { id: string } | undefined,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.listForProfile(
      username,
      viewer?.id ?? null,
      cursor,
      limit ? Number(limit) : 20,
    );
  }

  // POST /posts/:id/like — toggle like (auth required)
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.posts.toggleLike(user.id, id);
  }

  // POST /posts/:id/comments — add a comment (auth required)
  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async comment(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<PublicComment> {
    const parsed = createCommentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.posts.addComment(user.id, id, parsed.data);
  }

  // GET /posts/:id/comments — list comments (public)
  @Get(':id/comments')
  comments(@Param('id') id: string) {
    return this.posts.listComments(id);
  }

  // DELETE /posts/:id — owner soft delete (auth required)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.posts.deleteOwn(user.id, id);
  }
}
