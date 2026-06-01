import Link from 'next/link';
import { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-[16px] font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-[14px] text-text-secondary max-w-sm mb-6">{description}</p>
      )}
      {cta && (
        <Link href={cta.href} className="btn-primary">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
