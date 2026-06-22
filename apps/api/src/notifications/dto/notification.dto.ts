// Notifications DTOs.

export type NotificationType =
  | 'booking_received'
  | 'review_received'
  | 'new_follower'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'event_from_following';

export type PublicNotification = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type UnreadCountResponse = { unread: number };
export type NotificationsListResponse = {
  items: PublicNotification[];
  nextCursor: string | null;
};
