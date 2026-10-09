import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    setAuthModalMode,
    login,
    register,
  } = useAuth();

  const navigate = useNavigate();

  // Sign Up Form States
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Login Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('DELIVERY_PERSON');

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isAuthModalOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSwitchToLogin = () => {
    resetFormState();
    setAuthModalMode('login');
  };

  const handleSwitchToSignup = () => {
    resetFormState();
    setAuthModalMode('signup');
  };

  // Submit Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupUsername.trim()) {
      setErrorMsg('Please enter a username.');
      return;
    }
    if (!signupPhone.trim()) {
      setErrorMsg('Please enter a phone number.');
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register({
        username: signupUsername.trim(),
        phone: signupPhone.trim(),
        password: signupPassword,
      });

      setSuccessMsg(`Welcome, ${user.name}! Your Delivery Boy account is ready.`);
      setTimeout(() => {
        closeAuthModal();
        navigate('/delivery');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginUsername.trim()) {
      setErrorMsg('Please enter your username.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(loginUsername.trim(), loginPassword, loginRole);

      setSuccessMsg(`Authenticated as ${user.role === 'ADMIN' ? 'Admin' : 'Delivery Boy'}!`);

      setTimeout(() => {
        closeAuthModal();
        if (user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/delivery');
        }
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify username and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="bg-white rounded"
        style={{
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-in-out',
        }}
      >
        {/* Modal Header */}
        <div
          className="tm-bg-primary text-white p-3 d-flex justify-content-between align-items-center"
          style={{ borderBottom: '3px solid #d43b42' }}
        >
          <div className="d-flex align-items-center">
            <i
              className={`fa ${
                authModalMode === 'signup' ? 'fa-user-plus' : 'fa-sign-in'
              } mr-2`}
              style={{ fontSize: '1.25rem' }}
            ></i>
            <h5 className="m-0 font-weight-bold" style={{ fontSize: '1.2rem' }}>
              {authModalMode === 'signup'
                ? 'Delivery Boy Sign Up'
                : 'Staff & Delivery Boy Login'}
            </h5>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="text-white"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 5px',
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          {/* Notification Alert */}
          {errorMsg && (
            <div
              className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fa fa-exclamation-triangle mr-2"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              className="alert alert-success py-2 px-3 mb-3 d-flex align-items-center"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fa fa-check-circle mr-2"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ===================== SIGN UP FORM ===================== */}
          {authModalMode === 'signup' ? (
            <form onSubmit={handleSignupSubmit}>
              <p className="text-muted mb-3" style={{ fontSize: '0.88rem' }}>
                Create a Delivery Boy account to log receipts and upload delivery slip proofs.
              </p>

              {/* Username Input */}
              <div className="form-group mb-3">
                <label
                  htmlFor="signup-username"
                  className="font-weight-bold mb-1"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-user mr-1 tm-color-primary"></i> Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  className="form-control"
                  placeholder="Enter username (e.g. bhushan26)"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  style={{ height: '44px', fontSize: '0.9rem' }}
                  required
                  autoFocus
                />
              </div>

              {/* Phone No Input */}
              <div className="form-group mb-3">
                <label
                  htmlFor="signup-phone"
                  className="font-weight-bold mb-1"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-phone mr-1 tm-color-primary"></i> Phone No.
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  className="form-control"
                  placeholder="Enter phone number (e.g. +91 9820011223)"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  style={{ height: '44px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="form-group mb-4">
                <label
                  htmlFor="signup-password"
                  className="font-weight-bold mb-1"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-lock mr-1 tm-color-primary"></i> Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  className="form-control"
                  placeholder="Create password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  style={{ height: '44px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-block text-white font-weight-bold mb-3"
                style={{
                  backgroundColor: '#ee5057',
                  border: 'none',
                  height: '46px',
                  fontSize: '1rem',
                  borderRadius: '4px',
                  boxShadow: '0 3px 6px rgba(238, 80, 87, 0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa fa-spinner fa-spin mr-2"></i> Registering...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>

              {/* Already Registered Link */}
              <div className="text-center pt-2 border-top">
                <button
                  type="button"
                  onClick={handleSwitchToLogin}
                  className="btn btn-link text-decoration-none"
                  style={{
                    color: '#ee5057',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Already registered ? Log in here
                </button>
              </div>
            </form>
          ) : (
            /* ===================== LOG IN FORM ===================== */
            <form onSubmit={handleLoginSubmit}>
              <p className="text-muted mb-3" style={{ fontSize: '0.88rem' }}>
                Log in to access your assigned view (Delivery Boy or Admin Console).
              </p>

              {/* Username Input */}
              <div className="form-group mb-3">
                <label
                  htmlFor="login-username"
                  className="font-weight-bold mb-1"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-user mr-1 tm-color-primary"></i> Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  className="form-control"
                  placeholder="Enter username (e.g. admin@26 or delivery boy)"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{ height: '44px', fontSize: '0.9rem' }}
                  required
                  autoFocus
                />
              </div>

              {/* Password Input */}
              <div className="form-group mb-3">
                <label
                  htmlFor="login-password"
                  className="font-weight-bold mb-1"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-lock mr-1 tm-color-primary"></i> Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-control"
                  placeholder="Enter password (e.g. admin_05)"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ height: '44px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              {/* Select Role: Delivery or Admin */}
              <div className="form-group mb-4">
                <label
                  className="font-weight-bold mb-2 d-block"
                  style={{ fontSize: '0.85rem', color: '#1f3646' }}
                >
                  <i className="fa fa-tags mr-1 tm-color-primary"></i> Select Role
                </label>

                <div className="row no-gutters" style={{ gap: '10px' }}>
                  {/* Delivery Boy Role Option */}
                  <div className="col">
                    <button
                      type="button"
                      onClick={() => setLoginRole('DELIVERY_PERSON')}
                      className="btn btn-block d-flex align-items-center justify-content-center"
                      style={{
                        height: '44px',
                        border:
                          loginRole === 'DELIVERY_PERSON'
                            ? '2px solid #ee5057'
                            : '1px solid #ddd',
                        backgroundColor:
                          loginRole === 'DELIVERY_PERSON' ? '#fbe9ea' : '#fff',
                        color:
                          loginRole === 'DELIVERY_PERSON' ? '#ee5057' : '#555',
                        fontWeight: loginRole === 'DELIVERY_PERSON' ? 700 : 500,
                        fontSize: '0.88rem',
                        borderRadius: '4px',
                      }}
                    >
                      <i className="fa fa-motorcycle mr-2"></i> Delivery Boy
                    </button>
                  </div>

                  {/* Admin Role Option */}
                  <div className="col">
                    <button
                      type="button"
                      onClick={() => setLoginRole('ADMIN')}
                      className="btn btn-block d-flex align-items-center justify-content-center"
                      style={{
                        height: '44px',
                        border:
                          loginRole === 'ADMIN'
                            ? '2px solid #ee5057'
                            : '1px solid #ddd',
                        backgroundColor:
                          loginRole === 'ADMIN' ? '#fbe9ea' : '#fff',
                        color:
                          loginRole === 'ADMIN' ? '#ee5057' : '#555',
                        fontWeight: loginRole === 'ADMIN' ? 700 : 500,
                        fontSize: '0.88rem',
                        borderRadius: '4px',
                      }}
                    >
                      <i className="fa fa-shield mr-2"></i> Admin
                    </button>
                  </div>
                </div>

                {/* Admin Helper Hint */}
                {loginRole === 'ADMIN' && (
                  <div
                    className="mt-2 p-2 rounded"
                    style={{
                      backgroundColor: '#f8f9fa',
                      fontSize: '0.78rem',
                      color: '#666',
                      borderLeft: '3px solid #ee5057',
                    }}
                  >
                    <i className="fa fa-info-circle mr-1 tm-color-primary"></i>
                    Admin Credentials: Username <strong>admin@26</strong> &bull; Password <strong>admin_05</strong>
                  </div>
                )}
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-block text-white font-weight-bold mb-3"
                style={{
                  backgroundColor: '#ee5057',
                  border: 'none',
                  height: '46px',
                  fontSize: '1rem',
                  borderRadius: '4px',
                  boxShadow: '0 3px 6px rgba(238, 80, 87, 0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa fa-spinner fa-spin mr-2"></i> Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>

              {/* Link to Switch to Sign Up */}
              <div className="text-center pt-2 border-top">
                <button
                  type="button"
                  onClick={handleSwitchToSignup}
                  className="btn btn-link text-decoration-none"
                  style={{
                    color: '#ee5057',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  Don&apos;t have an account? Sign up here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
