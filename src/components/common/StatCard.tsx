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
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between hover:border-line-strong transition-colors shadow-sm">
      <div className="flex items-center justify-between text-xs font-medium text-muted mb-2">
        <span>{label}</span>
        {icon && <span className="text-muted/80">{icon}</span>}
      </div>

      <div>
        <div className={`text-2xl font-bold tracking-tight ${trendColor}`}>{value}</div>
        {subValue && <div className="text-[11px] text-muted-2 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};
