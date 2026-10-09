import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const ToastNotification: React.FC = () => {
  const { toast, clearToast } = useAuth();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const iconMap = {
    success: 'fa-check-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-circle',
    error: 'fa-times-circle',
  };

  const bgBorderMap = {
    success: { border: '#28a745', iconColor: '#28a745' },
    info: { border: '#17a2b8', iconColor: '#17a2b8' },
    warning: { border: '#ffc107', iconColor: '#e0a800' },
    error: { border: '#ee5057', iconColor: '#ee5057' },
  };

  const styleConfig = bgBorderMap[toast.type] || bgBorderMap.success;

  return (
    <div
      style={{
        position: 'fixed',
        top: '85px',
        right: '25px',
        zIndex: 10090,
        minWidth: '320px',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        borderRadius: '8px',
        borderLeft: `5px solid ${styleConfig.border}`,
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      role="alert"
    >
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <i
          className={`fa ${iconMap[toast.type] || 'fa-info-circle'}`}
          style={{ fontSize: '1.4rem', color: styleConfig.iconColor, marginTop: '2px' }}
        ></i>
        <div style={{ flex: 1 }}>
          <h6
            style={{
              margin: '0 0 4px 0',
              fontWeight: 700,
              color: '#1f3646',
              fontSize: '0.95rem',
            }}
          >
            {toast.title}
          </h6>
          <p
            style={{
              margin: 0,
              fontSize: '0.84rem',
              color: '#555',
              lineHeight: '1.4',
            }}
          >
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={clearToast}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
          }}
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      </div>

      {/* Progress animation bar */}
      <div
        style={{
          height: '3px',
          backgroundColor: styleConfig.border,
          animation: 'toastProgress 4.5s linear forwards',
          opacity: 0.8,
        }}
      ></div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;
