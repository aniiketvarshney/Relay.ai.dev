import { cn } from '@/lib/utils';

const variants = {
  success: 'text-accent-green bg-accent-green/10',
  warning: 'text-accent-amber bg-accent-amber/10',
  danger: 'text-accent-red bg-accent-red/10',
  info: 'text-accent-blue bg-accent-blue/10',
  neutral: 'text-text-secondary bg-surface',
  purple: 'text-accent-purple bg-accent-purple/10',
} as const;

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[6px] text-[12px] font-medium font-mono',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
