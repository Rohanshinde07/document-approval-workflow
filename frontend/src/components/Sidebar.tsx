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

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const isOwnerOrAdmin =
    user.email === 'admin@demo.com' ||
    user.email === 'rohanyshinde07@gmail.com' ||
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
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Top Header & Brand */}
        <div>
          <div
            style={{
              padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  flexShrink: 0,
                }}
              >
                D
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    DocApproval
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
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
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Collapse Sidebar"
              >
                ◀
              </button>
            )}
          </div>

          {/* Quick Persona Switcher (For Owners/Admins) */}
          {!collapsed && (
            <div style={{ padding: '0.75rem 1.25rem 0.25rem' }}>
              <PersonaSwitcher />
            </div>
          )}

          {/* Navigation Links */}
          <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {!collapsed && (
              <div style={{ padding: '0.25rem 0.75rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              <div style={{ padding: '1rem 0.75rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Compliance & System
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="sidebar-link"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              title="How Workflow Works"
            >
              <span className="sidebar-icon">💡</span>
              {!collapsed && <span className="sidebar-text">Workflow Guide</span>}
            </button>

            {isOwnerOrAdmin && (
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
            padding: collapsed ? '1rem 0.5rem' : '1rem 1.25rem',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
                title={user.email}
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
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {user.email}
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
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
                title="Sign Out"
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
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.85rem',
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
