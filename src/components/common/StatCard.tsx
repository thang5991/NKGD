import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'profit' | 'loss' | 'neutral';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend = 'neutral',
  icon,
}) => {
  const trendColor = {
    profit: 'text-profit',
    loss: 'text-loss',
    neutral: 'text-text',
  }[trend];

  return (
    <div className="bg-surface border border-line rounded-xl p-3 sm:p-4 flex min-w-0 flex-col justify-between hover:border-line-strong transition-colors shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-1 text-[11px] font-medium text-muted sm:text-xs">
        <span>{label}</span>
        {icon && <span className="text-muted/80">{icon}</span>}
      </div>

      <div>
        <div className={`break-words text-xl font-bold tracking-tight sm:text-2xl ${trendColor}`}>{value}</div>
        {subValue && <div className="text-[11px] text-muted-2 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};
