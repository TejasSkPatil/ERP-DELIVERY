import React from 'react';

interface StatCardProps {
  icon: string;
  title: string;
  count: number | string;
  subtitle: string;
  badge?: string;
  colClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  count,
  subtitle,
  badge,
  colClass = 'col-12 col-sm-6 col-md-3 col-lg-3 col-xl-3',
}) => {
  return (
    <article className={`${colClass} tm-article mb-4 mb-lg-0`}>
      <div
        className="bg-white p-3 rounded"
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
          minHeight: '235px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <i
          className={`fa ${icon} tm-color-primary`}
          style={{ fontSize: '2.5rem', marginBottom: '12px' }}
        ></i>
        <h3
          className="tm-color-primary"
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#1f3646',
            lineHeight: '1.1',
            marginBottom: '6px',
          }}
        >
          {count}
        </div>
        <p
          className="tm-margin-b-0 text-muted"
          style={{ fontSize: '0.78rem', lineHeight: '1.3', marginBottom: '8px' }}
        >
          {subtitle}
        </p>
        {badge && (
          <span
            className="badge"
            style={{
              background: '#ee5057',
              color: 'white',
              borderRadius: '2px',
              padding: '4px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </article>
  );
};

export default StatCard;
