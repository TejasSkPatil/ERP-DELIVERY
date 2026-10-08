import React, { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  showDownArrow?: boolean;
  children?: ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  actionText,
  actionHref = '#main-content',
  onActionClick,
  showDownArrow = true,
  children,
}) => {
  return (
    <header>
      {/* Coral Section 2 Banner */}
      <div className="tm-section-2">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2 className="tm-section-title" style={{ marginBottom: '10px' }}>
                {title}
              </h2>
              {subtitle && (
                <p className="tm-color-white tm-section-subtitle">{subtitle}</p>
              )}
              {actionText && (
                <div style={{ display: 'inline-flex', gap: '15px' }}>
                  <a
                    href={actionHref}
                    onClick={onActionClick}
                    className="tm-color-white tm-btn-white-bordered"
                  >
                    {actionText}
                  </a>
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Downward SVG Chevron Polygon Arrow */}
      {showDownArrow && (
        <div className="tm-section tm-position-relative" style={{ minHeight: 'auto' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="tm-section-down-arrow"
          >
            <polygon fill="#ee5057" points="0,0  100,0  50,60"></polygon>
          </svg>
        </div>
      )}
    </header>
  );
};

export default Header;
