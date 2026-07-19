import type { DailyCount } from '../types/statistics';
import './VolumeChart.css';

// Fixed design-pixel viewBox (not percentage-based) so the SVG scales
// uniformly on both axes -- a percentage-width viewBox stretched non-
// uniformly would skew the bars' rounded corners into ellipses.
const CHART_WIDTH = 800;
const CHART_HEIGHT = 180;
const BASELINE_Y = CHART_HEIGHT - 24;
const BAR_MAX_WIDTH = 32;
const BAR_GAP = 4;

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${month}/${day}`;
}

// Rounded top corners, square baseline -- a plain <rect rx> rounds all
// four corners, which reads wrong for a bar anchored to a baseline.
function topRoundedBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  return `
    M ${x} ${y + height}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    L ${x + width - r} ${y}
    Q ${x + width} ${y} ${x + width} ${y + r}
    L ${x + width} ${y + height}
    Z
  `;
}

export function VolumeChart({ data }: { data: DailyCount[] }) {
  if (data.length === 0) {
    return <p className="volume-chart__empty">No messages captured yet.</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const bandWidth = CHART_WIDTH / data.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth - BAR_GAP);

  return (
    <div className="volume-chart">
      <svg
        className="volume-chart__svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Message volume by day"
      >
        <line x1="0" y1={BASELINE_Y} x2={CHART_WIDTH} y2={BASELINE_Y} className="volume-chart__baseline" />
        {data.map((point, index) => {
          const barHeight = (point.count / maxCount) * (BASELINE_Y - 12);
          const x = index * bandWidth + (bandWidth - barWidth) / 2;
          const y = BASELINE_Y - barHeight;
          const height = Math.max(barHeight, 0);
          return (
            <path key={point.date} d={topRoundedBarPath(x, y, barWidth, height, 4)} className="volume-chart__bar">
              <title>
                {point.date}: {point.count} message{point.count === 1 ? '' : 's'}
              </title>
            </path>
          );
        })}
      </svg>
      <div className="volume-chart__axis">
        {data.map((point) => (
          <span key={point.date} style={{ width: `${(bandWidth / CHART_WIDTH) * 100}%` }}>
            {formatShortDate(point.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
