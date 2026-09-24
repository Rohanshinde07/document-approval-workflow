import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-glow">
            <span>D</span>
          </div>
          <h1 className="login-title">DocApproval Workspace</h1>
          <p className="login-subtitle">
            Enterprise Document Revision & Sequential Approval Engine
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(241, 245, 249, 0.8)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: !isRegister ? 'white' : 'transparent',
              color: !isRegister ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: !isRegister ? 700 : 500,
              cursor: 'pointer',
              boxShadow: !isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: isRegister ? 'white' : 'transparent',
              color: isRegister ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: isRegister ? 700 : 500,
              cursor: 'pointer',
              boxShadow: isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  className="form-input with-icon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-icon-wrapper">
              <span className="input-icon">✉</span>
              <input
                type="email"
                className="form-input with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                className="form-input with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Minimum 6 characters' : '••••••••'}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  className="form-input with-icon"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span> {isRegister ? 'Creating account...' : 'Authenticating...'}
              </span>
            ) : isRegister ? (
              'Create Account & Sign In →'
            ) : (
              'Sign In to Dashboard →'
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="system-status-indicator">
            <span className="status-dot"></span>
            <span>DocApproval Platform • Ready for fresh workflows</span>
          </div>
        </div>
      </div>
    </div>
  );
};
