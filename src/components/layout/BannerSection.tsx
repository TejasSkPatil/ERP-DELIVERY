import React from 'react';

interface BannerSectionProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  onButtonClick?: () => void;
}

export const BannerSection: React.FC<BannerSectionProps> = ({
  title = 'We are here to help you?',
  subtitle = 'Subscribe to get our newsletters',
  buttonText = 'Subscribe Newsletters',
  buttonHref = '#',
  onButtonClick,
}) => {
  return (
    <>
      <div className="tm-section-2">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2 className="tm-section-title">{title}</h2>
              <p className="tm-color-white tm-section-subtitle">{subtitle}</p>
              <a
                href={buttonHref}
                className="tm-color-white tm-btn-white-bordered"
                onClick={(e) => {
                  if (onButtonClick) {
                    e.preventDefault();
                    onButtonClick();
                  }
                }}
              >
                {buttonText}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="tm-section tm-position-relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="tm-section-down-arrow"
        >
          <polygon fill="#ee5057" points="0,0  100,0  50,60"></polygon>
        </svg>
      </div>
    </>
  );
};

export default BannerSection;
