// Tiny inline-SVG sparkline. Smooth line + soft area fill underneath.
// No external library — keeps bundle small and renders pixel-perfect at any size.

interface SparklineProps {
  values: number[];
  /** Tailwind text-color class used for the stroke + tinted fill. */
  colorClass?: string;
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
}

export function Sparkline({
  values,
  colorClass = 'text-brand-purple',
  width = 100,
  height = 30,
  className,
  strokeWidth = 1.6,
}: SparklineProps) {
  if (values.length < 2) {
    return <div className={`h-[${height}px] w-full ${className ?? ''}`} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  // Smooth cardinal-ish path
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
      const prev = points[i - 1]!;
      const cpX1 = (prev[0] + p[0]) / 2;
      return `Q ${cpX1.toFixed(2)} ${prev[1].toFixed(2)} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `sparkline-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`block ${colorClass} ${className ?? ''}`}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
