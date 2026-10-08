import React from 'react';

interface StatCardProps {
  icon: string;
  title: string;
  count: number | string;
  subtitle: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  count,
  subtitle,
  badge,
}) => {
  return (
    <article className="col-sm-12 col-md-4 col-lg-4 col-xl-4 tm-article">
      <i className={`fa tm-fa-6x ${icon} tm-color-primary tm-margin-b-20`}></i>
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
      <p className="tm-margin-b-0">{subtitle}</p>
      {badge && (
        <span
          className="badge"
          style={{
            background: '#ee5057',
            color: 'white',
            borderRadius: 0,
            padding: '5px 10px',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            marginTop: '8px',
            display: 'inline-block',
          }}
        >
          {badge}
        </span>
      )}
    </article>
  );
};

export default StatCard;
