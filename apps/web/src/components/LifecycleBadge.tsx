// LifecycleBadge — renders a status pill driven by `getEventLifecycle()`.
// Used on EventCard, event detail hero, explore filters — single component
// guarantees a LIVE pulse looks identical everywhere.

import type { LifecycleBadge as LifecycleBadgeType } from '@/lib/event-lifecycle';
import { LIFECYCLE_TONE_CLASSES } from '@/lib/event-lifecycle';

export function LifecycleBadge({
  badge,
  size = 'md',
}: {
  badge: LifecycleBadgeType;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
        ? 'px-3 py-1 text-xs'
        : 'px-2.5 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-extrabold uppercase tracking-wider ${sizeClass} ${LIFECYCLE_TONE_CLASSES[badge.tone]}`}
    >
      {badge.pulse && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
      {badge.label}
    </span>
  );
}
