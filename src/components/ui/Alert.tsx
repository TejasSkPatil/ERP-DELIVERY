import React, { ReactNode } from 'react';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

interface AlertProps {
  type?: AlertType;
  icon?: string;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  icon,
  title,
  children,
  onDismiss,
  className = '',
}) => {
  const metaMap: Record<AlertType, { bg: string; color: string; border: string; defaultIcon: string }> = {
    success: {
      bg: '#d4edda',
      color: '#155724',
      border: '#28a745',
      defaultIcon: 'fa-check-circle',
    },
    danger: {
      bg: '#f8d7da',
      color: '#721c24',
      border: '#ee5057',
      defaultIcon: 'fa-exclamation-circle',
    },
    warning: {
      bg: '#fff9e6',
      color: '#856404',
      border: '#ffc107',
      defaultIcon: 'fa-exclamation-triangle',
    },
    info: {
      bg: '#e2f0fb',
      color: '#0c5460',
      border: '#17a2b8',
      defaultIcon: 'fa-info-circle',
    },
  };

  const current = metaMap[type];
  const activeIcon = icon || current.defaultIcon;

  return (
    <div
      className={className}
      style={{
        backgroundColor: current.bg,
        color: current.color,
        borderLeft: `5px solid ${current.border}`,
        padding: '14px 20px',
        fontSize: '0.88rem',
        borderRadius: 0,
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <i
          className={`fa ${activeIcon} mr-2`}
          style={{ fontSize: '1.2rem', color: current.border }}
          aria-hidden="true"
        ></i>
        <div>
          {title && <strong className="mr-1">{title}</strong>}
          {children}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: current.color,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '2px 8px',
            lineHeight: 1,
            opacity: 0.75,
          }}
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
