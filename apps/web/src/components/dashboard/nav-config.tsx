// Single source of truth for the dashboard nav. Both the desktop sidebar
// and the mobile drawer render from this list.

import type { ReactElement } from 'react';

export type Role = 'organiser' | 'vendor' | 'user';

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactElement;
  roles: Role[];
  badge?: number;
};

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon, roles: ['organiser', 'vendor', 'user'] },
  // User: posts from followed profiles
  { href: '/dashboard/feed', label: 'Feed', icon: ChatBubbleIcon, roles: ['user'] },
  // User: profile discovery (search organisers / vendors)
  { href: '/dashboard/people', label: 'Explore', icon: UsersIcon, roles: ['user'] },
  // Organiser-only: event management
  { href: '/dashboard/events', label: 'Events', icon: CalendarIcon, roles: ['organiser'] },
  // Vendor + user: browse public events
  { href: '/dashboard/explore', label: 'Browse Events', icon: CalendarIcon, roles: ['vendor', 'user'] },
  // Organiser + vendor: post composer + own posts list
  { href: '/dashboard/posts', label: 'Posts', icon: ChatBubbleIcon, roles: ['organiser', 'vendor'] },
  { href: '/dashboard/bookings', label: 'Stall Bookings', icon: BookmarkIcon, roles: ['organiser', 'vendor'] },
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon, roles: ['organiser', 'vendor'] },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon, roles: ['organiser', 'vendor', 'user'] },
];

export function roleLabel(role: Role): string {
  if (role === 'organiser') return 'Organiser';
  if (role === 'vendor') return 'Stall Owner';
  return 'Member';
}

// ---------- Icons ----------
type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5z" strokeLinejoin="round" />
    </svg>
  );
}
export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
export function BookmarkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  );
}
export function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 13h2" strokeLinecap="round" />
      <path d="M3 10h18" />
    </svg>
  );
}
export function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 19V5M10 19v-7M16 19V9M22 19H2" strokeLinecap="round" />
    </svg>
  );
}
export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 12a8 8 0 0 1-11.7 7.07L4 21l1.9-4.3A8 8 0 1 1 21 12z" strokeLinejoin="round" />
    </svg>
  );
}
export function CrownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 17l2-9 5 5 2-8 2 8 5-5 2 9H3z" strokeLinejoin="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}
export function StoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 8l1.5-4h15L21 8M3 8h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V8z" strokeLinejoin="round" />
      <path d="M5 11v9h14v-9" />
    </svg>
  );
}
export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.2L7.8 14 3 9.6 9.3 9 12 3z" strokeLinejoin="round" />
    </svg>
  );
}
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}
export function ChatBubbleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 12a8 8 0 0 1-11.7 7.07L4 21l1.9-4.3A8 8 0 1 1 21 12z" strokeLinejoin="round" />
      <path d="M9 11h6M9 14h4" strokeLinecap="round" />
    </svg>
  );
}
export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 18c0-2.5-2-4-4.5-4" strokeLinecap="round" />
    </svg>
  );
}
export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
    </svg>
  );
}
export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" strokeLinejoin="round" />
    </svg>
  );
}
export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function HeadsetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 17v-5a9 9 0 0 1 18 0v5" />
      <path d="M3 17a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2v2zM21 17a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2v2z" strokeLinejoin="round" />
    </svg>
  );
}
export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
