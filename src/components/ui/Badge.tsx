import React, { ReactNode } from 'react';

export type BadgeVariant = 'coral' | 'navy' | 'success' | 'warning' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: string;
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'coral',
  icon,
  children,
  className = '',
}) => {
  const colorMap: Record<BadgeVariant, { bg: string; color: string }> = {
    coral: { bg: '#ee5057', color: '#ffffff' },
    navy: { bg: '#1f3646', color: '#ffffff' },
    success: { bg: '#28a745', color: '#ffffff' },
    warning: { bg: '#ffc107', color: '#212529' },
    neutral: { bg: '#F4F4F4', color: '#495057' },
  };

  const current = colorMap[variant];

  return (
    <span
      className={`badge ${className}`.trim()}
      style={{
        backgroundColor: current.bg,
        color: current.color,
        borderRadius: 0,
        padding: '5px 10px',
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {icon && <i className={`fa ${icon} mr-1`}></i>}
      {children}
    </span>
  );
};

export default Badge;
