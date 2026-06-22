import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SocietyPostsService } from './society-posts.service';
import { createPostSchema, createReplySchema } from './dto/post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class SocietyPostsController {
  constructor(private readonly posts: SocietyPostsService) {}

  // GET /societies/:slug/posts — public list
  @Get('societies/:slug/posts')
  list(@Param('slug') slug: string) {
    return this.posts.list(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('societies/:slug/posts')
  @HttpCode(200)
  create(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Body() raw: unknown,
  ) {
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.posts.create(user.id, slug, parsed.data);
  }

  @Get('society-posts/:postId/replies')
  replies(@Param('postId') postId: string) {
    return this.posts.listReplies(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('society-posts/:postId/replies')
  @HttpCode(200)
  reply(
    @CurrentUser() user: { id: string },
    @Param('postId') postId: string,
    @Body() raw: unknown,
  ) {
    const parsed = createReplySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.posts.reply(user.id, postId, parsed.data);
  }
}
