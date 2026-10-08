import React from 'react';

interface FooterProps {
  systemTitle?: string;
  subNotice?: string;
}

export const Footer: React.FC<FooterProps> = ({
  systemTitle = 'ERP-DELIVERY \u2022 Pizza Delivery Proof Tracking System \u2022 Timezone: Asia/Kolkata',
  subNotice = 'Preserving original Level Template architecture \u2022 Strict 32-day MongoDB GridFS retention',
}) => {
  return (
    <footer className="tm-bg-dark-blue">
      <div className="container">
        <div className="row">
          <p className="col-sm-12 text-center tm-font-light tm-color-white p-4 tm-margin-b-0">
            {systemTitle}
            <br />
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {subNotice}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
