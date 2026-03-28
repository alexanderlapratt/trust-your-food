import './TrustBadge.css';

function getTrustLevel(score) {
  if (score >= 90) return { label: 'Highly Trusted', color: '#1a7a3a', bg: '#d4f0dc' };
  if (score >= 75) return { label: 'Trusted', color: '#2d6a3d', bg: '#c8ddc0' };
  if (score >= 60) return { label: 'Verified', color: '#5a7a2a', bg: '#ddecc8' };
  if (score >= 45) return { label: 'Building Trust', color: '#8b6914', bg: '#f0e8d0' };
  return { label: 'New Farm', color: '#6b7280', bg: '#f0ede8' };
}

function getArcPath(score, r = 32, cx = 40, cy = 40) {
  const pct = Math.min(score / 100, 0.999);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + pct * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = pct > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function TrustBadge({ score, size = 'md', showLabel = true }) {
  const level = getTrustLevel(score);
  const isLg = size === 'lg';
  const viewSize = isLg ? 80 : 56;
  const r = isLg ? 32 : 22;
  const cx = viewSize / 2;
  const cy = viewSize / 2;

  const pct = Math.min(score / 100, 0.999);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + pct * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = pct > 0.5 ? 1 : 0;
  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  const strokeWidth = isLg ? 5 : 4;

  return (
    <div className={`trust-badge trust-badge-${size}`} title={`Trust Score: ${score}/100 — ${level.label}`}>
      <div className="trust-arc-wrap">
        <svg viewBox={`0 0 ${viewSize} ${viewSize}`} width={viewSize} height={viewSize}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e0d8" strokeWidth={strokeWidth} />
          {/* Progress */}
          <path
            d={arcPath}
            fill="none"
            stroke={level.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
        <div className="trust-score-center" style={{ color: level.color }}>
          <span className="trust-number">{score}</span>
        </div>
      </div>
      {showLabel && (
        <span className="trust-label" style={{ color: level.color, background: level.bg }}>
          {level.label}
        </span>
      )}
    </div>
  );
}
