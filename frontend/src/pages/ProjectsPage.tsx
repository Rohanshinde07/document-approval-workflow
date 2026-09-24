import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectListItem } from '../types.js';
import { apiRequest } from '../api/client.js';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Project Modal
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const navigate = useNavigate();

  const loadProjects = () => {
    setLoading(true);
    apiRequest<ProjectListItem[]>('/api/projects')
      .then((data) => setProjects(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      const newProj = await apiRequest<{ id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: projectName, description: projectDesc }),
      });
      setShowModal(false);
      setProjectName('');
      setProjectDesc('');
      navigate(`/projects/${newProj.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading projects...</div>;
  if (error) return <div style={{ color: '#f87171', padding: '2rem' }}>Error: {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>My Projects</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Projects you are a member of and your assigned role on each.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'white',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
            No projects yet
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            Get started by creating your first project. You'll be the Owner and can invite team members and create documents.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-lg">
            + Create Your First Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {projects.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{p.name}</h2>
                  <span className="role-badge">{p.role}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  {p.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div>👥 <strong>{p.memberCount}</strong> Members</div>
                  <div>📄 <strong>{p.documentCount}</strong> Documents</div>
                </div>

                <Link to={`/projects/${p.id}`} className="btn btn-secondary" style={{ width: '100%' }}>
                  View Project Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Project */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create New Project</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
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
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Brief description of this project's scope..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
