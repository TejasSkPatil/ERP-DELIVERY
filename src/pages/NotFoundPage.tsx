import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="container text-center py-5" style={{ minHeight: '60vh', paddingTop: '100px' }}>
      <div className="tm-bg-white tm-bg-white-shadow p-5 d-inline-block" style={{ maxWidth: '600px' }}>
        <i className="fa fa-exclamation-triangle fa-4x tm-color-primary mb-3"></i>
        <h2 className="tm-color-primary font-weight-bold mb-2">404 - Page Not Found</h2>
        <p className="text-muted mb-4">
          The requested delivery portal route does not exist.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Deliveries
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
