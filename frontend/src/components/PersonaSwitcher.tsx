import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext.js';
import { setStoredToken, getStoredToken } from '../api/client.js';

interface Persona {
  role: string;
  name: string;
  email: string;
  badgeColor: string;
  icon: string;
  description: string;
}

const DEMO_PERSONAS: Persona[] = [
  {
    role: 'OWNER',
    name: 'Project Owner',
    email: 'rohanyshinde07@gmail.com',
    badgeColor: '#7c3aed',
    icon: '👑',
    description: 'Project Owner: Create projects, manage team, send invites & supervise workflow',
  },
  {
    role: 'ADMIN',
    name: 'System Administrator',
    email: 'admin@demo.com',
    badgeColor: '#4338ca',
    icon: '⚙️',
    description: 'System Admin: Global audit logs, metrics, compliance monitoring & system control',
  },
  {
    role: 'AUTHOR',
    name: 'Document Author',
    email: 'rohantrueview07@gmail.com',
    badgeColor: '#2563eb',
    icon: '✍️',
    description: 'Document Author: Drafts specs with templates, creates versions & submits for review',
  },
  {
    role: 'REVIEWER',
    name: 'Technical Reviewer',
    email: 'rohanyshinde21@gmail.com',
    badgeColor: '#d97706',
    icon: '🔍',
    description: 'Technical Reviewer: Stage 2 Review, inline feedback, approve or request changes',
  },
  {
    role: 'APPROVER',
    name: 'Executive Approver',
    email: 'rohanyogeshshinde0@gmail.com',
    badgeColor: '#16a34a',
    icon: '🛡️',
    description: 'Executive Approver: Stage 3 Final sign-off or executive rejection with note',
  },
  {
    role: 'VIEWER',
    name: 'Stakeholder Viewer',
    email: 'k10xlegit@gmail.com',
    badgeColor: '#64748b',
    icon: '👁️',
    description: 'Stakeholder Viewer: Read-only access to published documents & immutable audit logs',
  },
];

export const PersonaSwitcher: React.FC = () => {
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!user) return null;

  const originalAdminToken = sessionStorage.getItem('demo_original_admin');
  const isOwnerOrAdmin =
    user.email === 'admin@demo.com' ||
    user.email === 'rohanyshinde07@gmail.com' ||
    user.role === 'ADMIN' ||
    user.email.startsWith('admin@');

  // Only owners/admins can see persona switcher (or anyone currently impersonating)
  if (!isOwnerOrAdmin && !originalAdminToken) {
    return null;
  }

  const handleSwitch = async (persona: Persona) => {
    if (user.email === persona.email) {
      setIsOpen(false);
      return;
    }

    setSwitching(persona.email);
    try {
      // Save original admin token if this is the first switch from an admin session
      if (isOwnerOrAdmin && !originalAdminToken) {
        const currentToken = getStoredToken();
        if (currentToken) {
          sessionStorage.setItem('demo_original_admin', currentToken);
          sessionStorage.setItem('demo_original_admin_email', user.email);
        }
      }

      // Login as target persona using standard demo password
      await login(persona.email, 'password123');
      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(`Could not switch persona: ${err.message}`);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <>
      {/* Sleek Button in Sidebar */}
      <div style={{ margin: '0.35rem 0' }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
          title="Switch test persona to verify approval workflow (Owner only)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem' }}>🎭</span>
            <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3730a3' }}>
                Test Personas
              </div>
              <div style={{ fontSize: '0.66rem', color: '#6366f1', fontWeight: 500 }}>
                1-Click Role Switcher
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 700 }}>⇄</span>
        </button>
      </div>

      {/* Switcher Modal - rendered via portal to prevent sidebar clipping */}
      {isOpen &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '620px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>🎭</span>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      1-Click Demo Persona Switcher
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                      Instant role test without entering credentials (Owner feature)
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="modal-close"
                  style={{
                    fontSize: '1.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.25rem',
                    lineHeight: 1,
                  }}
                  title="Close modal"
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {DEMO_PERSONAS.map((persona) => {
                  const isCurrent = user.email === persona.email;
                  const isBusy = switching === persona.email;

                  return (
                    <div
                      key={persona.email}
                      onClick={() => !isCurrent && !switching && handleSwitch(persona)}
                      style={{
                        background: isCurrent ? 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)' : 'white',
                        border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.9rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isCurrent ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isCurrent ? '0 2px 8px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{persona.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                              {persona.name}
                            </span>
                            <span
                              style={{
                                background: `${persona.badgeColor}15`,
                                color: persona.badgeColor,
                                border: `1px solid ${persona.badgeColor}40`,
                                borderRadius: '10px',
                                padding: '1px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {persona.role}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  background: '#2563eb',
                                  color: 'white',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: '#64748b',
                              marginTop: '0.2rem',
                              lineHeight: 1.35,
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                            }}
                          >
                            {persona.description}
                          </div>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!!switching}
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.4rem 0.9rem',
                            flexShrink: 0,
                            fontWeight: 600,
                          }}
                        >
                          {isBusy ? 'Switching...' : 'Switch →'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '1rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Default demo password: <code style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>password123</code>
                </span>
                <button onClick={() => setIsOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 1rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
