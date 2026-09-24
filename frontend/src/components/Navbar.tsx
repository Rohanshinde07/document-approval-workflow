import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  const isAdmin =
    user.role === 'ADMIN' ||
    user.email === 'admin@demo.com' ||
    user.email.startsWith('admin@');

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="brand-logo">D</div>
          <span>DocApproval Engine</span>
        </div>

        <nav className="navbar-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            My Queue
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Projects
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              style={({ isActive }) => ({
                background: isActive
                  ? 'linear-gradient(135deg, #312e81, #4338ca)'
                  : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                color: 'white',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
              })}
            >
              ⚙ Admin
            </NavLink>
          )}

          <div className="user-badge">
            <div className="user-avatar" title={user.email}>
              {getInitial(user.name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '0.5rem' }}
            >
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
