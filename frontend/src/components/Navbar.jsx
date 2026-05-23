import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top glass-panel py-3">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center fw-bold fs-4 text-gradient-primary" to="/">
          <i className="bi bi-box-seam-fill me-2 fs-3"></i>
          CodePilot AI
        </Link>
        
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/') ? 'active text-white' : ''}`} to="/">
                Home
              </Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive('/dashboard') ? 'active text-white' : ''}`} to="/dashboard">
                  Dashboard
                </Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {user ? (
              <>
                <span className="text-secondary d-none d-md-inline">
                  Welcome, <strong className="text-light">{user.username}</strong>
                </span>
                <Link to="/dashboard" className="btn btn-sm btn-secondary-outline px-3 py-2">
                  <i className="bi bi-grid-fill me-1"></i> Console
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-danger px-3 py-2"
                  id="logout-btn"
                >
                  <i className="bi bi-box-arrow-right me-1"></i> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-secondary-outline px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary-glow px-3 py-2">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
