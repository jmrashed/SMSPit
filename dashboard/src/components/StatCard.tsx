const TONE: Record<'neutral' | 'good' | 'critical', string> = {
  neutral: 'text-slate-900 dark:text-white',
  good: 'text-green-600 dark:text-green-400',
  critical: 'text-red-600 dark:text-red-400',
};

export function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'good' | 'critical';
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <span className="block text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`mt-1 block text-3xl font-semibold ${TONE[tone]}`}>{value.toLocaleString()}</span>
    </div>
  );
}
