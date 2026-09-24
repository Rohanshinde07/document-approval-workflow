import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalDocuments: number;
  byStatus: Record<string, number>;
  totalComments: number;
  totalAuditEvents: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  projectCount: number;
}

interface AdminProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  memberCount: number;
  documentCount: number;
}

interface AdminAuditEvent {
  id: string;
  action: string;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
  document: { id: string; title: string } | null;
  fromStatus?: string;
  toStatus?: string;
}

const STATUS_ORDER = ['DRAFT', 'IN_REVIEW', 'IN_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiRequest<AdminStats>('/api/admin/stats'),
      apiRequest<AdminUser[]>('/api/admin/users'),
      apiRequest<AdminProject[]>('/api/admin/projects'),
      apiRequest<AdminAuditEvent[]>('/api/admin/audit?limit=50'),
    ])
      .then(([s, u, p, a]) => {
        setStats(s);
        setUsers(u);
        setProjects(p);
        setAuditEvents(a);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setProjectSubmitting(true);
    try {
      await apiRequest('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      setShowProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      loadData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setProjectSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading admin dashboard...</div>;
  if (error) return <div style={{ color: '#dc2626', padding: '2rem' }}>Error loading admin data: {error}</div>;

  const statusColors: Record<string, string> = {
    DRAFT: '#64748b',
    IN_REVIEW: '#d97706',
    IN_APPROVAL: '#4338ca',
    CHANGES_REQUESTED: '#dc2626',
    APPROVED: '#15803d',
    REJECTED: '#be123c',
  };

  return (
    <div>
      {/* Admin Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem 2.5rem',
          marginBottom: '2rem',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(67, 56, 202, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '1px',
              }}
            >
              ⚙ ADMIN
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              System Dashboard
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
            Platform-wide administration · {stats?.totalDocuments} documents · {stats?.totalUsers} users
          </p>
        </div>
        <button
          onClick={() => setShowProjectModal(true)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        >
          + Create New Project
        </button>
      </div>

      {/* Platform Stats Grid */}
      {stats && (
        <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
          <div className="metric-card">
            <div>
              <div className="metric-title">Total Users</div>
              <div className="metric-value">{stats.totalUsers}</div>
            </div>
            <div className="metric-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              👥
            </div>
          </div>
          <div className="metric-card">
            <div>
              <div className="metric-title">Total Projects</div>
              <div className="metric-value">{stats.totalProjects}</div>
            </div>
            <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              📂
            </div>
          </div>
          <div className="metric-card">
            <div>
              <div className="metric-title">Total Documents</div>
              <div className="metric-value">{stats.totalDocuments}</div>
            </div>
            <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              📄
            </div>
          </div>
          <div className="metric-card">
            <div>
              <div className="metric-title">Audit Events</div>
              <div className="metric-value">{stats.totalAuditEvents}</div>
            </div>
            <div className="metric-icon" style={{ background: 'rgba(22, 163, 74, 0.15)', color: '#4ade80' }}>
              📋
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Document Status Overview
        </button>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Users ({users.length})
        </button>
        <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
          Projects ({projects.length})
        </button>
        <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          Audit Log ({auditEvents.length})
        </button>
      </div>

      {/* Tab: Overview - Status Breakdown */}
      {activeTab === 'overview' && stats && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Document Status Distribution</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {stats.totalDocuments} total documents
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {STATUS_ORDER.map((status) => {
              const count = stats.byStatus[status] || 0;
              const pct = stats.totalDocuments > 0 ? Math.round((count / stats.totalDocuments) * 100) : 0;
              return (
                <div
                  key={status}
                  style={{
                    background: `${statusColors[status]}12`,
                    border: `1px solid ${statusColors[status]}30`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <StatusBadge status={status} />
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: statusColors[status] }}>{count}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: statusColors[status],
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{pct}% of total</div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Platform Summary</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div>💬 <strong style={{ color: 'var(--text-main)' }}>{stats.totalComments}</strong> Comments posted</div>
              <div>📋 <strong style={{ color: 'var(--text-main)' }}>{stats.totalAuditEvents}</strong> Audit events recorded</div>
              <div>👥 <strong style={{ color: 'var(--text-main)' }}>{stats.totalUsers}</strong> Registered users</div>
              <div>📂 <strong style={{ color: 'var(--text-main)' }}>{stats.totalProjects}</strong> Active projects</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">All Registered Users</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{users.length} total</span>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Project Memberships</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'var(--accent-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                        {u.email === 'admin@demo.com' && (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
                              color: 'white',
                              fontSize: '0.65rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              fontWeight: 700,
                              letterSpacing: '0.5px',
                            }}
                          >
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span
                        style={{
                          background: 'var(--accent-light)',
                          color: 'var(--accent-blue)',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        {u.projectCount} projects
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Projects */}
      {activeTab === 'projects' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">All Projects</h2>
            <button onClick={() => setShowProjectModal(true)} className="btn btn-primary btn-sm">
              + New Project
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Created By</th>
                  <th>Members</th>
                  <th>Documents</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.description && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{p.createdBy.name}</td>
                    <td>
                      <span className="role-badge">{p.memberCount} members</span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'rgba(245,158,11,0.1)',
                          color: '#b45309',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}
                      >
                        {p.documentCount} docs
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/projects/${p.id}`} className="btn btn-secondary btn-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Platform Audit Trail</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Last 50 events</span>
          </div>

          <div className="timeline">
            {auditEvents.map((evt) => (
              <div key={evt.id} className="timeline-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-main)' }}>{evt.actor?.name || 'System'}</span>{' '}
                    <span className="role-badge">{evt.action}</span>
                    {evt.document && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>
                        {' '}on{' '}
                        <Link to={`/documents/${evt.document.id}`} style={{ fontWeight: 600 }}>
                          {evt.document.title}
                        </Link>
                      </span>
                    )}
                    {evt.project && (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                        [{evt.project.name}]
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
                {(evt.fromStatus || evt.toStatus) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <code>{evt.fromStatus || '—'}</code> → <code>{evt.toStatus || '—'}</code>
                  </div>
                )}
              </div>
            ))}

            {auditEvents.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No audit events recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create New Project</h3>
              <button onClick={() => setShowProjectModal(false)} className="modal-close">×</button>
            </div>

            {modalError && (
              <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>{modalError}</div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief description of this project's scope..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowProjectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={projectSubmitting}>
                  {projectSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
