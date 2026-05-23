import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailOrUsername || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(emailOrUsername, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
  className="bg-dark-primary d-flex flex-column"
  style={{
    minHeight: '100dvh',
    overflowX: 'hidden',
    paddingTop: '72px',
  }}
>
      <Navbar />
      <div
  style={{
    position: 'absolute',
    width: 'min(420px, 70vw)',
height: 'min(420px, 70vw)',
    background: 'rgba(99,102,241,0.10)',
    filter: 'blur(120px)',
    top: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 0,
  }}
></div>

      <div
  className="container animate-slide-up"
  style={{
  paddingTop: 'clamp(5rem, 8vw, 7rem)',
  paddingBottom: '2rem',

  position: 'relative',
  zIndex: 2,

  width: '100%',
  flex: 1,

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}
>
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div
  className="glass-card glow-card auth-card"
              style={{
                borderRadius: '28px',
                boxShadow: `
                  0 25px 80px rgba(0,0,0,0.45),
                  0 0 40px rgba(99,102,241,0.08)
                `,
              }}>
              <div className="text-center mb-4">
                <i className="bi bi-stars text-gradient-primary fs-1 mb-2"></i>
                <h3 className="text-white fw-bold">Welcome Back</h3>
                <p className="text-secondary small">Continue exploring your AI-powered development workspace</p>
              </div>

              {error && (
                <div className="alert alert-danger py-2 border-0 bg-danger bg-opacity-10 text-danger small rounded" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label-custom" htmlFor="email-input">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    id="email-input"
                    className="form-control form-control-custom"
                    placeholder="Enter username or email"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between">
                    <label className="form-label-custom" htmlFor="password-input">
                      Password
                    </label>
                  </div>
                  <input
                    type="password"
                    id="password-input"
                    className="form-control form-control-custom"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary-glow w-100 py-3 mt-2 rounded-4"
                  disabled={loading}
                  id="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
                <p className="text-center text-secondary small mt-3 mb-0">
  Secure authentication powered by JWT session management.
</p>
              </form>

              <div className="text-center mt-4">
                <p className="text-secondary small mb-0">
                  New to CodePilot AI?{' '}
                  <Link to="/register" className="text-gradient-primary fw-semibold text-decoration-none">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
