import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, openAuthModal } = useAuth();
  const navigate = useNavigate();

  if (role !== 'ADMIN') {
    return (
      <div className="tm-section tm-section-pad tm-bg-gray" style={{ minHeight: '600px', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6 text-center">
              <div
                className="bg-white p-5 rounded"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  borderTop: '4px solid #ee5057',
                }}
              >
                <div
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    backgroundColor: '#fbe9ea',
                    color: '#ee5057',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    margin: '0 auto 20px auto',
                  }}
                >
                  <i className="fa fa-lock"></i>
                </div>

                <h3 className="font-weight-bold mb-2" style={{ color: '#1f3646' }}>
                  Admin Panel Access Restricted
                </h3>
                <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                  The Admin Console is <strong>only accessible to Admin</strong>. Delivery Boy accounts cannot view operational metrics, staff performance, or 32-day retention logs.
                </p>

                <div
                  className="p-3 mb-4 rounded text-left"
                  style={{
                    backgroundColor: '#fff8f8',
                    border: '1px solid #f1dede',
                    fontSize: '0.85rem',
                  }}
                >
                  <i className="fa fa-key tm-color-primary mr-2"></i>
                  <strong>Admin Login Credentials:</strong>
                  <div className="mt-1 font-family-monospace" style={{ color: '#333' }}>
                    Username: <code>admin@26</code> &bull; Password: <code>admin_05</code>
                  </div>
                </div>

                <div className="d-flex flex-wrap justify-content-center" style={{ gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="btn text-white font-weight-bold"
                    style={{
                      backgroundColor: '#ee5057',
                      padding: '10px 24px',
                      borderRadius: '4px',
                      border: 'none',
                    }}
                  >
                    <i className="fa fa-sign-in mr-2"></i> Log In as Admin
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/delivery')}
                    className="btn btn-outline-secondary font-weight-bold"
                    style={{
                      padding: '10px 24px',
                      borderRadius: '4px',
                    }}
                  >
                    <i className="fa fa-motorcycle mr-2"></i> Open Delivery Boy View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRouteGuard;
