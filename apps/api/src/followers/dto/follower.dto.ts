// Followers DTOs.

export type FollowedProfile = {
  id: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  verified: boolean;
  followersCount: number;
  avgRating: number;
  followedAt: string;
};

export type FollowToggleResponse = {
  isFollowing: boolean;
  followersCount: number;
};
