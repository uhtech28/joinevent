// Inline-SVG donut chart with center label.
// Use for "stall bookings 68%" and "profile completion 78%" style widgets.

interface DonutSegment {
  value: number;
  /** Tailwind text-color class — used as the stroke colour via currentColor. */
  colorClass: string;
  label?: string;
}

interface DonutProps {
  segments: DonutSegment[];
  /** Big center number, e.g. "68%" or "₹24,680" */
  centerValue?: string;
  /** Caption below the center value */
  centerCaption?: string;
  size?: number;
  thickness?: number;
}

export function Donut({
  segments,
  centerValue,
  centerCaption,
  size = 160,
  thickness = 18,
}: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          className="text-cream-200"
          strokeWidth={thickness}
          fill="none"
        />
        {segments.map((seg, i) => {
          const length = (seg.value / total) * circumference;
          const gap = circumference - length;
          const dashArray = `${length} ${gap}`;
          const strokeDashoffset = -offset;
          offset += length;
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              stroke="currentColor"
              className={seg.colorClass}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              fill="none"
            />
          );
        })}
      </svg>
      {(centerValue || centerCaption) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <span className="text-xl font-extrabold leading-none text-navy-800">{centerValue}</span>
          )}
          {centerCaption && (
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              {centerCaption}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
