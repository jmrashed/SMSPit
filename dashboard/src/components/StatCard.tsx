import './StatCard.css';

export function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'good' | 'critical' }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className={`stat-card__value stat-card__value--${tone}`}>{value.toLocaleString()}</span>
    </div>
  );
}
