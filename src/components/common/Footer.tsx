import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="tm-bg-dark-blue">
      <div className="container">
        <div className="row">
          <p className="col-sm-12 text-center tm-font-light tm-color-white p-4 tm-margin-b-0">
            ERP-DELIVERY &bull; Pizza Delivery Proof Tracking System &bull; Timezone: Asia/Kolkata
            <br />
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              Preserving original Level Template architecture &bull; Strict 32-day MongoDB GridFS retention
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
