import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = '650px',
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10001,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="tm-bg-white tm-bg-white-shadow"
        style={{
          maxWidth,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coral Title Bar */}
        <div
          className="tm-bg-primary tm-sidebar-pad d-flex align-items-center justify-content-between"
          style={{ padding: '18px 24px' }}
        >
          <div>
            <h3
              className="tm-color-white tm-sidebar-title mb-0"
              style={{ fontSize: '1.4rem', fontWeight: 600 }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className="tm-color-white tm-margin-b-0 tm-font-light"
                style={{ fontSize: '0.85rem' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.8rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="tm-pad" style={{ padding: '24px' }}>
          {children}

          {/* Optional Footer */}
          {footer && (
            <div className="d-flex justify-content-end mt-4" style={{ gap: '10px' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
