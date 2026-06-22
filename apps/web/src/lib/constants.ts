// Shared constants used across the landing page.
// One source of truth — change the waitlist URL once, it updates everywhere.

export const WAITLIST_URL = 'https://forms.gle/U4kbwU8A7eY9wYzT7';

// Kept short + on-brand. 5 items so the desktop header never wraps.
// Anchors must match section ids inside components/landing/* — keep in sync.
export const NAV_LINKS = [
  { href: '#organizers', label: 'Organizers' },
  { href: '#vendors', label: 'Vendors' },
  { href: '#packages', label: 'Pricing' },
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How It Works' },
];
