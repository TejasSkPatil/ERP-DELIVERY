import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserRole } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../auth/AuthModal';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const { user, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'ADMIN' && currentRole !== 'ADMIN') {
      setIsRoleDropdownOpen(false);
      setIsMobileMenuOpen(false);
      openAuthModal('login');
      return;
    }
    onRoleChange(role);
    setIsRoleDropdownOpen(false);
    setIsMobileMenuOpen(false);
    if (role === 'DELIVERY_PERSON') navigate('/delivery');
    else if (role === 'ADMIN') navigate('/admin');
  };

  const roleMeta: Record<UserRole, { label: string; icon: string }> = {
    DELIVERY_PERSON: { label: 'Delivery Boy', icon: 'fa-motorcycle' },
    ADMIN: { label: 'Admin Console', icon: 'fa-dashboard' },
  };

  return (
    <>
      <div className="tm-top-bar-bg"></div>
      <div className={`tm-top-bar ${isScrolled ? 'active' : ''}`} id="tm-top-bar">
        <div className="container">
          <div className="row">
            <nav className="navbar navbar-expand-lg narbar-light">
              <NavLink
                to="/"
                className="navbar-brand mr-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <img src="/img/logo.png" alt="Site logo" style={{ marginRight: '10px' }} />
                <span>Level</span>
                <span
                  style={{
                    color: '#ee5057',
                    fontWeight: 300,
                    marginLeft: '4px',
                    fontSize: '1.4rem',
                  }}
                >
                  DELIVERY
                </span>
              </NavLink>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                id="nav-toggle"
                className={`navbar-toggler ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '10px',
                  cursor: 'pointer',
                }}
              >
                <span className="navbar-toggler-icon">
                  <i className="fa fa-bars" style={{ fontSize: '1.5rem', color: '#ee5057' }}></i>
                </span>
              </button>

              {/* Navigation Menu */}
              <div
                className={`collapse navbar-collapse tm-bg-white ${
                  isMobileMenuOpen ? 'show' : ''
                }`}
                id="nav-content"
              >
                <ul className="navbar-nav ml-auto align-items-center">
                  <li className="nav-item">
                    <NavLink
                      to="/delivery"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <i className="fa fa-motorcycle mr-1"></i> Delivery Boy
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink
                      to="/admin"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        if (currentRole !== 'ADMIN') {
                          e.preventDefault();
                          openAuthModal('login');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <i className="fa fa-dashboard mr-1"></i> Admin Console
                      {currentRole !== 'ADMIN' && (
                        <i className="fa fa-lock ml-1 text-muted" style={{ fontSize: '0.75rem' }}></i>
                      )}
                    </NavLink>
                  </li>

                  {/* Active Role Selector Dropdown Tab */}
                  <li className="nav-item position-relative" style={{ borderRight: '1px solid #ccc' }}>
                    <a
                      className="nav-link"
                      href="#switch-role"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsRoleDropdownOpen(!isRoleDropdownOpen);
                      }}
                      style={{
                        backgroundColor: isRoleDropdownOpen ? '#ee5057' : 'transparent',
                        color: isRoleDropdownOpen ? 'white' : 'black',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <i className={`fa ${roleMeta[currentRole].icon} mr-1`}></i>
                      {roleMeta[currentRole].label}{' '}
                      <i className={`fa fa-angle-${isRoleDropdownOpen ? 'up' : 'down'} ml-1`}></i>
                    </a>

                    {isRoleDropdownOpen && (
                      <div
                        className="tm-bg-white tm-bg-white-shadow"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          minWidth: '240px',
                          zIndex: 10005,
                          borderTop: '3px solid #ee5057',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 15px',
                            background: '#F4F4F4',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#888',
                            textTransform: 'uppercase',
                          }}
                        >
                          Switch Active View:
                        </div>
                        <a
                          href="#role-delivery"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRoleSelect('DELIVERY_PERSON');
                          }}
                          className="d-block"
                          style={{
                            padding: '12px 18px',
                            color: currentRole === 'DELIVERY_PERSON' ? '#ee5057' : '#333',
                            fontWeight: currentRole === 'DELIVERY_PERSON' ? 700 : 400,
                            backgroundColor: currentRole === 'DELIVERY_PERSON' ? '#fbe9ea' : 'transparent',
                            textDecoration: 'none',
                            borderBottom: '1px solid #eee',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <i className="fa fa-motorcycle mr-2 tm-color-primary"></i> Delivery Boy
                        </a>
                        <a
                          href="#role-admin"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRoleSelect('ADMIN');
                          }}
                          className="d-block"
                          style={{
                            padding: '12px 18px',
                            color: currentRole === 'ADMIN' ? '#ee5057' : '#333',
                            fontWeight: currentRole === 'ADMIN' ? 700 : 400,
                            backgroundColor: currentRole === 'ADMIN' ? '#fbe9ea' : 'transparent',
                            textDecoration: 'none',
                            borderBottom: '1px solid #eee',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <i className="fa fa-dashboard mr-2 tm-color-primary"></i> Admin Console
                        </a>

                        <div style={{ padding: '10px 15px', background: '#fafafa', borderTop: '1px solid #eee' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoleDropdownOpen(false);
                              openAuthModal('signup');
                            }}
                            className="btn btn-sm btn-block text-white mb-2"
                            style={{ backgroundColor: '#ee5057', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            <i className="fa fa-user-plus mr-1"></i> Sign Up Delivery Boy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRoleDropdownOpen(false);
                              openAuthModal('login');
                            }}
                            className="btn btn-sm btn-block btn-outline-secondary"
                            style={{ fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            <i className="fa fa-sign-in mr-1"></i> Log In with Role
                          </button>
                          {user && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsRoleDropdownOpen(false);
                                logout();
                              }}
                              className="btn btn-sm btn-block btn-link text-danger p-0 mt-2"
                              style={{ fontSize: '0.75rem' }}
                            >
                              <i className="fa fa-power-off mr-1"></i> Log Out
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>

                  {/* PROMINENT SIGN UP BUTTON */}
                  <li className="nav-item ml-lg-2 my-2 my-lg-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openAuthModal('signup');
                      }}
                      className="btn text-white font-weight-bold"
                      style={{
                        backgroundColor: '#ee5057',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '4px',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(238, 80, 87, 0.35)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <i className="fa fa-user-plus mr-1"></i> Sign Up
                    </button>
                  </li>

                  {/* PROMINENT LOG IN BUTTON */}
                  <li className="nav-item ml-lg-1 my-2 my-lg-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="btn btn-light font-weight-bold"
                      style={{
                        border: '1px solid #ddd',
                        color: '#1f3646',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        backgroundColor: '#f8f9fa',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <i className="fa fa-sign-in mr-1 tm-color-primary"></i> Log In
                    </button>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <AuthModal />
    </>
  );
};

export default Navbar;
