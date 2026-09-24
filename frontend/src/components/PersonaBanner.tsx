import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { setStoredToken } from '../api/client.js';

interface PersonaBannerProps {
  onOpenSwitcher?: () => void;
}

export const PersonaBanner: React.FC<PersonaBannerProps> = ({ onOpenSwitcher }) => {
  const { user } = useAuth();
  if (!user) return null;

  const originalAdminToken = sessionStorage.getItem('demo_original_admin');
  if (!originalAdminToken) return null;

  const handleExitPersona = () => {
    setStoredToken(originalAdminToken);
    sessionStorage.removeItem('demo_original_admin');
    sessionStorage.removeItem('demo_original_admin_email');
    window.location.reload();
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
        color: 'white',
        padding: '0.6rem 1.5rem',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.1rem' }}>🎭</span>
        <span style={{ fontWeight: 600 }}>
          Testing Persona Mode: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{user.name}</span>
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '2px 8px',
            borderRadius: '12px',
            letterSpacing: '0.04em',
            fontWeight: 700,
          }}
        >
          SIMULATED SESSION
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {onOpenSwitcher && (
          <button
            onClick={onOpenSwitcher}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Switch Role
          </button>
        )}
        <button
          onClick={handleExitPersona}
          style={{
            background: '#6366f1',
            border: 'none',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          ✕ Exit & Return to Owner
        </button>
      </div>
    </div>
  );
};
