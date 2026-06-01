import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  delta,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  delta?: string;
  variant?: 'default' | 'danger' | 'success';
}) {
  const valueColor =
    variant === 'danger'
      ? 'text-accent-red'
      : variant === 'success'
        ? 'text-accent-green'
        : 'text-text-primary';

  return (
    <div className="card p-4">
      <div className={cn('font-mono text-[32px] leading-none', valueColor)}>{value}</div>
      <div className="text-[12px] text-text-muted mt-2">{label}</div>
      {delta && <div className="text-[12px] text-text-secondary mt-1">{delta}</div>}
    </div>
  );
}
