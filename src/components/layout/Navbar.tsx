import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { UserRole } from '../../types/auth';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  brandTitle?: string;
  brandSubtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  brandTitle = 'Level',
  brandSubtitle = 'DELIVERY',
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    onRoleChange(role);
    setIsRoleDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const roleMeta: Record<UserRole, { label: string; icon: string }> = {
    DELIVERY_PERSON: { label: 'Delivery Shift', icon: 'fa-motorcycle' },
    ADMIN: { label: 'Admin Console', icon: 'fa-dashboard' },
    USER: { label: 'Customer Portal', icon: 'fa-user' },
  };

  return (
    <>
      <div className="tm-top-bar-bg"></div>
      <div className={`tm-top-bar ${isScrolled ? 'active' : ''}`} id="tm-top-bar">
        <div className="container">
          <div className="row">
            <nav className="navbar navbar-expand-lg narbar-light">
              {/* Navbar Brand Logo and Text */}
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
                <img
                  src="/img/logo.png"
                  alt="Site logo"
                  style={{ marginRight: '10px' }}
                />
                <span>{brandTitle}</span>
                <span
                  style={{
                    color: '#ee5057',
                    fontSize: '1rem',
                    marginLeft: '8px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                  }}
                >
                  {brandSubtitle}
                </span>
              </NavLink>

              {/* Mobile Navbar Hamburger Toggle */}
              <button
                type="button"
                id="nav-toggle"
                className={`navbar-toggler ${isMobileMenuOpen ? '' : 'collapsed'}`}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              {/* Navbar Links List */}
              <div
                id="mainNav"
                className={`collapse navbar-collapse tm-bg-white ${
                  isMobileMenuOpen ? 'show' : ''
                }`}
              >
                <ul className="navbar-nav ml-auto">
                  <li className="nav-item">
                    <NavLink
                      to="/delivery"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <i className="fa fa-motorcycle mr-1"></i> Delivery Shift
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <i className="fa fa-dashboard mr-1"></i> Admin Console
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink
                      to="/customer"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <i className="fa fa-user mr-1"></i> Customer View
                    </NavLink>
                  </li>

                  {/* Role Switcher Menu Tab */}
                  <li
                    className="nav-item position-relative"
                    style={{ borderRight: '1px solid #ccc' }}
                  >
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
                      <i
                        className={`fa fa-angle-${
                          isRoleDropdownOpen ? 'up' : 'down'
                        } ml-1`}
                      ></i>
                    </a>

                    {isRoleDropdownOpen && (
                      <div
                        className="tm-bg-white tm-bg-white-shadow"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          minWidth: '220px',
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
                            backgroundColor:
                              currentRole === 'DELIVERY_PERSON' ? '#fbe9ea' : 'transparent',
                            textDecoration: 'none',
                            borderBottom: '1px solid #eee',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <i className="fa fa-motorcycle mr-2 tm-color-primary"></i> Delivery Person
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
                            backgroundColor:
                              currentRole === 'ADMIN' ? '#fbe9ea' : 'transparent',
                            textDecoration: 'none',
                            borderBottom: '1px solid #eee',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <i className="fa fa-dashboard mr-2 tm-color-primary"></i> Admin Console
                        </a>
                        <a
                          href="#role-user"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRoleSelect('USER');
                          }}
                          className="d-block"
                          style={{
                            padding: '12px 18px',
                            color: currentRole === 'USER' ? '#ee5057' : '#333',
                            fontWeight: currentRole === 'USER' ? 700 : 400,
                            backgroundColor:
                              currentRole === 'USER' ? '#fbe9ea' : 'transparent',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <i className="fa fa-user mr-2 tm-color-primary"></i> Customer / User
                        </a>
                      </div>
                    )}
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
