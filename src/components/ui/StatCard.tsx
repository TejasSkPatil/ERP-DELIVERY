import React from 'react';
import Badge from './Badge';

interface StatCardProps {
  icon: string;
  title: string;
  count: number | string;
  subtitle: string;
  badge?: string;
  badgeVariant?: 'coral' | 'navy' | 'success' | 'warning' | 'neutral';
  colSize?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  count,
  subtitle,
  badge,
  badgeVariant = 'coral',
  colSize = 'col-sm-12 col-md-4 col-lg-4 col-xl-4',
}) => {
  return (
    <article className={`${colSize} tm-article`}>
      <i className={`fa tm-fa-6x ${icon} tm-color-primary tm-margin-b-20`} aria-hidden="true"></i>
      <h3 className="tm-color-primary tm-article-title-1">{title}</h3>
      <div
        style={{
          fontSize: '3.2rem',
          fontWeight: 700,
          color: '#1f3646',
          lineHeight: '1.1',
          marginBottom: '10px',
        }}
      >
        {count}
      </div>
      <p className="tm-margin-b-0" style={{ color: '#555', fontSize: '0.88rem' }}>
        {subtitle}
      </p>
      {badge && (
        <div style={{ marginTop: '12px' }}>
          <Badge variant={badgeVariant}>{badge}</Badge>
        </div>
      )}
    </article>
  );
};

export default StatCard;
