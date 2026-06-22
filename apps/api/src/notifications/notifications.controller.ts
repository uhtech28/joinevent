import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /notifications?onlyUnread=true&limit=30&cursor=...
  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('onlyUnread') onlyUnread?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.notifications.listForUser(user.id, {
      limit: limit ? Number(limit) : undefined,
      cursor,
      onlyUnread: onlyUnread === 'true',
    });
  }

  // GET /notifications/unread-count
  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notifications.unreadCount(user.id);
  }

  // POST /notifications/:id/read
  @Post(':id/read')
  @HttpCode(200)
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  // POST /notifications/read-all
  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notifications.markAllRead(user.id);
  }
}
