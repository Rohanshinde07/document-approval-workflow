import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { setStoredToken } from '../api/client.js';

interface InviteDetails {
  email: string;
  role: string;
  expiresAt: string;
  project: { id: string; name: string; description?: string };
  invitedBy: { name: string; email: string };
  isExistingUser?: boolean;
  existingUserName?: string | null;
}

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successProject, setSuccessProject] = useState('');

  useEffect(() => {
    if (!token) return;
    apiRequest<InviteDetails>(`/api/invites/${token}`)
      .then((data) => {
        setInvite(data);
        if (data.isExistingUser) {
          // Pre-populate with default demo password for quick 1-click convenience
          setPassword('password123');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // If already logged in as the right person — one-click accept
  const isExistingUserMatch = user && invite && user.email === invite.email;

  const handleAccept = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError('');

    // Validation
    if (!isExistingUserMatch) {
      if (invite?.isExistingUser) {
        if (!password) {
          setFormError('Please enter your password. (Default is password123)');
          return;
        }
      } else {
        if (!name.trim()) { setFormError('Please enter your full name.'); return; }
        if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
      }
    }

    setSubmitting(true);
    try {
      const body: any = {};
      if (!isExistingUserMatch) {
        if (!invite?.isExistingUser) {
          body.name = name.trim();
        }
        body.password = password;
      }

      const result = await apiRequest<any>(`/api/invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Auto-login if we got a token back
      if (result.token) {
        setStoredToken(result.token);
      }

      setSuccess(true);
      setSuccessProject(result.projectName);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/projects/${result.projectId}`);
        window.location.reload(); // refresh auth state
      }, 2200);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const roleColors: Record<string, string> = {
    OWNER: '#7c3aed',
    AUTHOR: '#2563eb',
    REVIEWER: '#d97706',
    APPROVER: '#15803d',
    VIEWER: '#64748b',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontWeight: 600 }}>Loading your invitation...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
            Invitation Invalid
          </h1>
          <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{error}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
            Welcome aboard!
          </h1>
          <p style={{ color: '#475569' }}>
            You've joined <strong style={{ color: '#2563eb' }}>{successProject}</strong>.
            <br />Redirecting you to the project...
          </p>
          <div style={{ marginTop: '1.5rem', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                borderRadius: '4px',
                animation: 'progressBar 2.2s linear forwards',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const isNewUser = !user || user.email !== invite.email;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 40%, #faf5ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
            padding: '2rem 2.5rem',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>DocApproval Engine</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Project Invitation
          </div>
        </div>

        {/* Invite Card */}
        <div style={{ padding: '2rem 2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              {invite.invitedBy.name} invited you
            </h1>
            <p style={{ color: '#475569', fontSize: '0.925rem' }}>
              to join <strong style={{ color: '#2563eb' }}>{invite.project.name}</strong> as a:
            </p>
            <div
              style={{
                display: 'inline-block',
                background: `${roleColors[invite.role] || '#2563eb'}15`,
                color: roleColors[invite.role] || '#2563eb',
                border: `1px solid ${roleColors[invite.role] || '#2563eb'}40`,
                borderRadius: '20px',
                padding: '0.4rem 1.2rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                marginTop: '0.6rem',
                letterSpacing: '0.02em',
              }}
            >
              {invite.role}
            </div>
          </div>

          {/* Project Info */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {invite.project.name}
            </div>
            {invite.project.description && (
              <div style={{ color: '#475569', fontSize: '0.875rem' }}>{invite.project.description}</div>
            )}
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Invited by <strong>{invite.invitedBy.name}</strong> ({invite.invitedBy.email})
              {' '}· Expires {new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Form */}
          {formError && (
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                color: '#dc2626',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {formError}
            </div>
          )}

          {isExistingUserMatch ? (
            // Already logged in as the invited user — one-click accept
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                You're logged in as <strong>{user.email}</strong>. Click below to join the project.
              </p>
              <button
                onClick={() => handleAccept()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}
                disabled={submitting}
              >
                {submitting ? 'Joining...' : `Join ${invite.project.name} →`}
              </button>
            </div>
          ) : (
            <form onSubmit={handleAccept}>
              <div style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                This invite is for <strong style={{ color: '#2563eb' }}>{invite.email}</strong>.
                {' '}
                {user ? (
                  <div style={{ marginTop: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      ⚠️ Account Mismatch
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      You're currently signed in as <strong>{user.email}</strong>, but this invitation is for <strong style={{ color: '#2563eb' }}>{invite.email}</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        window.location.reload();
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ background: 'white', border: '1px solid #f87171', color: '#dc2626', fontWeight: 600 }}
                    >
                      Sign Out of {user.email} & Continue →
                    </button>
                  </div>
                ) : invite.isExistingUser ? (
                  <span>
                    Existing account detected for <strong style={{ color: '#2563eb' }}>{invite.existingUserName || invite.email}</strong>. Enter your password to accept.
                  </span>
                ) : (
                  <span>Create your account below to accept, or <a href="/login" style={{ color: '#2563eb' }}>log in</a> if you already have one.</span>
                )}
              </div>

              {!user && (
                <>
                  {invite.isExistingUser ? (
                    <>
                      {/* Existing User Password Box */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          padding: '0.9rem 1rem',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', color: '#166534', lineHeight: 1.4 }}>
                          🔑 Default demo password is <strong style={{ fontFamily: 'monospace', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>password123</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPassword('password123')}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Fill Default
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Password for {invite.email}</label>
                        <input
                          type="password"
                          className="form-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password (default: password123)"
                          required
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}
                        disabled={submitting}
                      >
                        {submitting ? 'Authenticating & Joining...' : `Sign In & Join ${invite.project.name} →`}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* New User Registration Box */}
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                          💡 Tip: You can use default demo password <strong style={{ fontFamily: 'monospace' }}>password123</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPassword('password123');
                            setConfirmPassword('password123');
                          }}
                          style={{
                            background: '#e2e8f0',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Use Default
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Your Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Rohan Shinde"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Create Password</label>
                        <input
                          type="password"
                          className="form-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters (e.g. password123)"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                          type="password"
                          className="form-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}
                        disabled={submitting}
                      >
                        {submitting ? 'Creating Account & Joining...' : 'Create Account & Join Project →'}
                      </button>
                    </>
                  )}
                </>
              )}
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};
