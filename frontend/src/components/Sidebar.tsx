import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { PersonaSwitcher } from './PersonaSwitcher.js';
import { WorkflowGuideModal } from './WorkflowGuideModal.js';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';

  const isAdmin =
    user.role === 'ADMIN' ||
    user.email === 'admin@demo.com' ||
    user.email.startsWith('admin@');

  return (
    <>
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}
        style={{
          width: collapsed ? '72px' : '260px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
          boxShadow: '1px 0 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Top Header & Brand */}
        <div>
          <div
            style={{
              padding: collapsed ? '1.25rem 0.5rem' : '1.25rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
                  flexShrink: 0,
                  letterSpacing: '-0.03em',
                }}
              >
                D
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                    DocApproval
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid rgba(37,99,235,0.2)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}
                    >
                      v2.4 Enterprise
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={onToggleCollapse}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  transition: 'all 0.15s ease',
                }}
                title="Collapse Sidebar"
              >
                ◀
              </button>
            )}
          </div>

          {/* Quick Persona Switcher Button */}
          {!collapsed && (
            <div style={{ padding: '0.85rem 1rem 0.25rem' }}>
              <PersonaSwitcher />
            </div>
          )}

          {/* Navigation Links */}
          <nav style={{ padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {!collapsed && (
              <div
                style={{
                  padding: '0.4rem 0.5rem 0.4rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Workflow Hub
              </div>
            )}

            <NavLink
              to="/"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title="My Action Queue"
            >
              <span className="sidebar-icon">📥</span>
              {!collapsed && <span className="sidebar-text">My Action Queue</span>}
            </NavLink>

            <NavLink
              to="/projects"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title="Projects"
            >
              <span className="sidebar-icon">📁</span>
              {!collapsed && <span className="sidebar-text">Projects Directory</span>}
            </NavLink>

            <NavLink
              to="/documents"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title="All Documents"
            >
              <span className="sidebar-icon">📄</span>
              {!collapsed && <span className="sidebar-text">All Documents</span>}
            </NavLink>

            {!collapsed && (
              <div
                style={{
                  padding: '1rem 0.5rem 0.4rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Compliance & System
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="sidebar-link"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title="How Workflow Works"
            >
              <span className="sidebar-icon">💡</span>
              {!collapsed && <span className="sidebar-text">Workflow Guide</span>}
            </button>

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="Admin Console"
              >
                <span className="sidebar-icon">⚙️</span>
                {!collapsed && <span className="sidebar-text">Admin Console</span>}
              </NavLink>
            )}
          </nav>
        </div>

        {/* Footer User Profile Card */}
        <div
          style={{
            padding: collapsed ? '1rem 0.5rem' : '1rem 1.15rem',
            borderTop: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                }}
                title={user.name}
              >
                {getInitial(user.name)}
              </div>

              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      marginTop: '1px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                    <span>Active Session</span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleLogout}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
                title="Sign Out"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                  (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                }}
              >
                Logout
              </button>
            )}
          </div>

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              style={{
                marginTop: '0.75rem',
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '4px 0',
                fontSize: '0.75rem',
              }}
              title="Expand Sidebar"
            >
              ▶
            </button>
          )}
        </div>
      </aside>

      <WorkflowGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
};
