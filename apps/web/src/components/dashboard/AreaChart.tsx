// Larger area chart with x-axis labels + optional highlighted peak.
// Inline SVG, no library. Used in the "Earnings Overview" card.

interface AreaChartProps {
  values: number[];
  labels: string[];
  colorClass?: string;
  height?: number;
  /** Highlight one point with a marker + label. Index into `values`. */
  highlightIndex?: number;
  highlightLabel?: string;
}

export function AreaChart({
  values,
  labels,
  colorClass = 'text-brand-purple',
  height = 200,
  highlightIndex,
  highlightLabel,
}: AreaChartProps) {
  const width = 600; // viewBox width; SVG scales responsively
  const padX = 18;
  const padTop = 24;
  const padBottom = 32;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const min = 0;
  const max = Math.max(...values) * 1.15 || 1;
  const range = max - min;
  const stepX = innerW / (values.length - 1 || 1);

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padTop + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  // Smooth quadratic path
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p[0]} ${p[1]}`;
      const prev = points[i - 1]!;
      const cpx = (prev[0] + p[0]) / 2;
      return `Q ${cpx} ${prev[1]} ${p[0]} ${p[1]}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${padX + innerW} ${padTop + innerH} L ${padX} ${padTop + innerH} Z`;
  const gradId = `area-grad-${Math.random().toString(36).slice(2, 8)}`;

  // y-axis gridlines (4 lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padTop + innerH - t * innerH,
    label: Math.round((min + t * range) / 1000) + 'K',
  }));

  const peak = highlightIndex != null ? points[highlightIndex] : undefined;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full ${colorClass}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y gridlines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padX}
            x2={padX + innerW}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />
          <text
            x={padX - 6}
            y={t.y + 3}
            fontSize="10"
            textAnchor="end"
            className="fill-current opacity-40"
            style={{ color: '#7a6a5a' }}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Area + line */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Highlight marker */}
      {peak && (
        <g>
          <circle cx={peak[0]} cy={peak[1]} r="9" fill="currentColor" opacity="0.18" />
          <circle
            cx={peak[0]}
            cy={peak[1]}
            r="5"
            fill="white"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          {highlightLabel && (
            <g>
              <rect
                x={peak[0] - 28}
                y={peak[1] - 28}
                width={56}
                height={18}
                rx="4"
                fill="#142049"
              />
              <text
                x={peak[0]}
                y={peak[1] - 15}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fill="white"
              >
                {highlightLabel}
              </text>
            </g>
          )}
        </g>
      )}

      {/* X-axis labels */}
      {labels.map((l, i) => {
        const x = padX + i * stepX;
        return (
          <text
            key={i}
            x={x}
            y={height - 10}
            fontSize="11"
            textAnchor="middle"
            className="fill-current opacity-50"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
