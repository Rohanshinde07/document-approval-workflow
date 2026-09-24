import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ProjectMember, Task, ProjectRole } from '../types.js';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { DOCUMENT_TEMPLATES, DocumentTemplate } from '../data/templates.js';
import { FileImportDropzone } from '../components/FileImportDropzone.js';
import { SLATimerBadge } from '../components/SLATimerBadge.js';
import { useAuth } from '../context/AuthContext.js';

interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  myRole: ProjectRole;
  members: ProjectMember[];
  tasks: Task[];
}

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deletingProject, setDeletingProject] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'documents' | 'members'>('documents');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocTaskId, setNewDocTaskId] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocSummary, setNewDocSummary] = useState('');
  const [docSubmitting, setDocSubmitting] = useState(false);

  // Edit Document state
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTaskId, setEditTaskId] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Gemini AI Draft Generator
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showAiDraftBox, setShowAiDraftBox] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');

  const [showEditAiBox, setShowEditAiBox] = useState(false);
  const [editAiPrompt, setEditAiPrompt] = useState('');
  const [generatingEditAi, setGeneratingEditAi] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('REVIEWER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [lastInviteUrl, setLastInviteUrl] = useState('');

  const [actionError, setActionError] = useState('');

  const handleGenerateAiDraft = async () => {
    const promptToUse = aiDraftPrompt.trim() || newDocTitle.trim();
    if (!promptToUse) {
      alert('Please enter a brief topic or prompt for Gemini to write.');
      return;
    }
    setGeneratingAI(true);
    try {
      const res = await apiRequest<{ content: string }>('/api/ai/generate-draft', {
        method: 'POST',
        body: JSON.stringify({ prompt: promptToUse, currentContent: newDocContent }),
      });
      if (res.content) {
        setNewDocContent(res.content);
        if (!newDocTitle) {
          setNewDocTitle(promptToUse);
        }
        setShowAiDraftBox(false);
      }
    } catch (err: any) {
      alert(`AI generation failed: ${err.message}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleGenerateEditAi = async () => {
    const promptToUse = editAiPrompt.trim() || editTitle.trim();
    if (!promptToUse) {
      alert('Please enter a brief topic or prompt for Gemini to rewrite/expand.');
      return;
    }
    setGeneratingEditAi(true);
    try {
      const res = await apiRequest<{ content: string }>('/api/ai/generate-draft', {
        method: 'POST',
        body: JSON.stringify({ prompt: promptToUse, currentContent: editContent }),
      });
      if (res.content) {
        setEditContent(res.content);
        setShowEditAiBox(false);
      }
    } catch (err: any) {
      alert(`AI generation failed: ${err.message}`);
    } finally {
      setGeneratingEditAi(false);
    }
  };

  const loadData = () => {
    if (!id) return;
    Promise.all([
      apiRequest<ProjectDetail>(`/api/projects/${id}`),
      apiRequest<any[]>(`/api/projects/${id}/documents`),
    ])
      .then(([projData, docsData]) => {
        setProject(projData);
        setDocuments(docsData);
        // Load pending invites if owner
        if (projData.myRole === 'OWNER') {
          apiRequest<any[]>(`/api/invites/projects/${id}/pending`)
            .then((invites) => setPendingInvites(invites))
            .catch(() => setPendingInvites([]));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setDocSubmitting(true);

    try {
      await apiRequest(`/api/projects/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          title: newDocTitle,
          taskId: newDocTaskId || undefined,
          content: newDocContent,
          changeSummary: newDocSummary || 'Initial version',
        }),
      });

      setShowDocModal(false);
      setNewDocTitle('');
      setNewDocTaskId('');
      setNewDocContent('');
      setNewDocSummary('');
      loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setInviteSubmitting(true);
    setLastInviteUrl('');

    try {
      const result: any = await apiRequest(`/api/invites/projects/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setLastInviteUrl(result.inviteUrl || '');
      setInviteEmail('');
      // Refresh pending invites
      apiRequest<any[]>(`/api/invites/projects/${id}/pending`)
        .then((invites) => setPendingInvites(invites))
        .catch(() => {});
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    try {
      await apiRequest(`/api/invites/${inviteId}`, { method: 'DELETE' });
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: ProjectRole) => {
    try {
      await apiRequest(`/api/projects/${id}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiRequest(`/api/projects/${id}/members/${memberId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading project details...</div>;
  if (error) return <div style={{ color: '#f87171', padding: '2rem' }}>Error loading project: {error}</div>;
  if (!project) return null;

  const canCreateDoc = project.myRole === 'OWNER' || project.myRole === 'AUTHOR';
  const isOwner = project.myRole === 'OWNER';

  const canEdit = (doc: any) => {
    const isDocAuthor = doc.authorId === user?.id || doc.author?.id === user?.id;
    return doc.status === 'DRAFT' && (isDocAuthor || isOwner || user?.role === 'ADMIN');
  };

  const canDelete = (doc: any) => {
    const isDocAuthor = doc.authorId === user?.id || doc.author?.id === user?.id;
    return isOwner || user?.role === 'ADMIN' || (isDocAuthor && (doc.status === 'DRAFT' || doc.status === 'REJECTED'));
  };

  const handleOpenEditModal = async (doc: any) => {
    setEditError('');
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditTaskId(doc.taskId || doc.task?.id || '');
    setEditContent('');
    try {
      const detail = await apiRequest<any>(`/api/documents/${doc.id}`);
      setEditContent(detail.currentVersion?.content || '');
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      await apiRequest(`/api/documents/${editingDoc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          taskId: editTaskId || null,
          content: editContent,
        }),
      });
      setEditingDoc(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    if (!confirm(`Are you sure you want to permanently delete document "${doc.title}"?\nThis action cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Are you sure you want to permanently delete project "${project.name}" and all associated documents, tasks, and audit records?\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingProject(true);
    try {
      await apiRequest(`/api/projects/${project.id}`, { method: 'DELETE' });
      navigate('/projects');
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
      setDeletingProject(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (statusFilter && doc.status !== statusFilter) return false;
    if (taskFilter && doc.taskId !== taskFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{project.name}</h1>
              <span className="role-badge">My Role: {project.myRole}</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{project.description || 'No description'}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {project.myRole === 'OWNER' && (
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="btn btn-secondary btn-sm"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.85rem',
                }}
                title="Permanently delete this project"
              >
                <span>🗑️</span>
                <span>{deletingProject ? 'Deleting...' : 'Delete Project'}</span>
              </button>
            )}

            {canCreateDoc && (
              <button onClick={() => setShowDocModal(true)} className="btn btn-primary">
                + New Document
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents ({documents.length})
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Project Members ({project.members.length})
        </button>
      </div>

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="card-title">Project Documents</h2>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="IN_APPROVAL">IN_APPROVAL</option>
                <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <select
                className="form-select"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
              >
                <option value="">All Tasks</option>
                {project.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No documents match the selected filters.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Linked Task</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Current Version</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link to={`/documents/${doc.id}`} style={{ fontWeight: 600 }}>
                          {doc.title}
                        </Link>
                      </td>
                      <td>{doc.task?.title || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                          <StatusBadge status={doc.status} />
                          {(doc.status === 'IN_REVIEW' || doc.status === 'IN_APPROVAL') && (
                            <SLATimerBadge
                              documentId={doc.id}
                              status={doc.status}
                              startTime={doc.updatedAt}
                              canNudge={doc.authorId === user?.id || project.myRole === 'OWNER'}
                            />
                          )}
                        </div>
                      </td>
                      <td>{doc.author.name}</td>
                      <td>v{doc.currentVersion?.versionNumber || 1}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-sm">
                            Open →
                          </Link>
                          {canEdit(doc) && (
                            <button
                              onClick={() => handleOpenEditModal(doc)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Draft"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                color: 'var(--accent-blue)',
                                fontWeight: 600,
                                borderColor: 'rgba(37,99,235,0.3)',
                                padding: '0.25rem 0.55rem',
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {canDelete(doc) && (
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              className="btn btn-danger btn-sm"
                              title="Delete Document"
                              style={{ padding: '0.25rem 0.55rem' }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Project Members</h2>
            {isOwner && (
              <button onClick={() => setShowInviteModal(true)} className="btn btn-primary btn-sm">
                ✉ Invite Member
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {isOwner && <th>Management</th>}
                </tr>
              </thead>
              <tbody>
                {project.members.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.user.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.user.email}</td>
                    <td>
                      {isOwner ? (
                        <select
                          className="form-select"
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value as ProjectRole)}
                          style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="AUTHOR">AUTHOR</option>
                          <option value="REVIEWER">REVIEWER</option>
                          <option value="APPROVER">APPROVER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span className="role-badge">{m.role}</span>
                      )}
                    </td>
                    {isOwner && (
                      <td>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invites */}
          {isOwner && pendingInvites.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⏳ Pending Invitations ({pendingInvites.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingInvites.map((inv: any) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(245, 158, 11, 0.06)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.email}</span>
                      <span className="role-badge" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{inv.role}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Invited by {inv.invitedBy?.name} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => handleRevokeInvite(inv.id)} className="btn btn-danger btn-sm">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Modal: New Document */}
      {showDocModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create New Document</h3>
              <button onClick={() => setShowDocModal(false)} className="modal-close">
                ×
              </button>
            </div>

            {actionError && (
              <div style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {actionError}
              </div>
            )}

            {/* Template Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                ⚡ Quick Start with Template
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {DOCUMENT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setNewDocTitle(tmpl.titleSuggestion);
                      setNewDocContent(tmpl.content);
                      setNewDocSummary(`Initial version (${tmpl.name})`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.background = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{tmpl.icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {tmpl.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tmpl.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateDocument}>
              {/* 📁 PDF, DOCX, TXT, MD File Importer */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span>📁</span>
                  <span>Import Existing Specification File (Optional)</span>
                </label>
                <FileImportDropzone
                  onFileLoaded={({ content, suggestedTitle }) => {
                    setNewDocContent(content);
                    if (!newDocTitle) {
                      setNewDocTitle(suggestedTitle);
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>

              {project.tasks.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Link to Task (Optional)</label>
                  <select
                    className="form-select"
                    value={newDocTaskId}
                    onChange={(e) => setNewDocTaskId(e.target.value)}
                  >
                    <option value="">None (Unlinked)</option>
                    {project.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Initial Version Content (Markdown supported)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiDraftBox(!showAiDraftBox)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                      borderColor: '#818cf8',
                      color: '#4338ca',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '3px 9px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Generate specification draft with Google Gemini 3.6 Flash"
                  >
                    <span>✨</span>
                    <span>{showAiDraftBox ? 'Hide AI Draft Box' : 'Draft with Gemini AI'}</span>
                  </button>
                </div>

                {/* Gemini AI Prompt Copilot Box */}
                {showAiDraftBox && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.35rem' }}>
                      ✨ Google Gemini 3.6 Flash Specification Writer
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter topic or instructions for Gemini to write..."
                        value={aiDraftPrompt}
                        onChange={(e) => setAiDraftPrompt(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateAiDraft}
                        disabled={generatingAI}
                        className="btn btn-primary btn-sm"
                        style={{ background: '#4f46e5', flexShrink: 0, fontWeight: 700 }}
                      >
                        {generatingAI ? 'Writing...' : 'Generate →'}
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  className="form-textarea"
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="# Document Title&#10;&#10;Write initial specification content here..."
                  rows={6}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Revision Summary</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDocSummary}
                  onChange={(e) => setNewDocSummary(e.target.value)}
                  placeholder="Initial draft"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={docSubmitting}>
                  {docSubmitting ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member by Email */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">✉ Invite Member by Email</h3>
              <button onClick={() => { setShowInviteModal(false); setLastInviteUrl(''); setActionError(''); }} className="modal-close">
                ×
              </button>
            </div>

            {actionError && (
              <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem', background: 'rgba(220,38,38,0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)' }}>
                {actionError}
              </div>
            )}

            {/* Success: show invite link */}
            {lastInviteUrl ? (
              <div>
                <div
                  style={{
                    background: 'rgba(22, 163, 74, 0.08)',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.5rem' }}>✅ Invitation Sent!</div>
                  <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>
                    An invite email has been sent (or logged to server console if SMTP is not configured).
                    You can also share this link directly:
                  </p>
                  <div
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: '#2563eb',
                      wordBreak: 'break-all',
                      cursor: 'pointer',
                    }}
                    onClick={() => { navigator.clipboard.writeText(lastInviteUrl); }}
                    title="Click to copy"
                  >
                    {lastInviteUrl}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>📋 click to copy</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Want to invite another person?
                </p>
                <form onSubmit={handleSendInvite}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Role</label>
                    <select className="form-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as ProjectRole)}>
                      <option value="OWNER">OWNER</option>
                      <option value="AUTHOR">AUTHOR</option>
                      <option value="REVIEWER">REVIEWER</option>
                      <option value="APPROVER">APPROVER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button type="button" onClick={() => { setShowInviteModal(false); setLastInviteUrl(''); }} className="btn btn-secondary">Close</button>
                    <button type="submit" className="btn btn-primary" disabled={inviteSubmitting}>
                      {inviteSubmitting ? 'Sending...' : 'Send Another Invite'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSendInvite}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', background: 'var(--accent-light)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.15)' }}>
                  <strong style={{ color: 'var(--accent-blue)' }}>How it works:</strong> The invitee receives an email with a secure link.
                  If they don't have an account yet, they can create one when they accept.
                  The link expires in <strong>72 hours</strong>.
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address to Invite</label>
                  <input
                    type="email"
                    className="form-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Project Role</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                  >
                    <option value="OWNER">OWNER — Can manage members & create documents</option>
                    <option value="AUTHOR">AUTHOR — Can create & submit documents</option>
                    <option value="REVIEWER">REVIEWER — Reviews submitted documents</option>
                    <option value="APPROVER">APPROVER — Final approval authority</option>
                    <option value="VIEWER">VIEWER — Read-only access</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={inviteSubmitting}>
                    {inviteSubmitting ? 'Sending Invite...' : '✉ Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Document */}
      {editingDoc && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Draft: {editingDoc.title}</h3>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setShowEditAiBox(false);
                }}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Linked Task (Optional)</label>
                <select
                  className="form-select"
                  value={editTaskId}
                  onChange={(e) => setEditTaskId(e.target.value)}
                >
                  <option value="">No task linked</option>
                  {project.tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import File Section */}
              <div style={{ marginBottom: '1rem' }}>
                <FileImportDropzone
                  onFileLoaded={(fileData) => {
                    setEditContent(fileData.content);
                    if (fileData.suggestedTitle && !editTitle) {
                      setEditTitle(fileData.suggestedTitle);
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Specification Content (Markdown)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditAiBox(!showEditAiBox)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                      borderColor: '#818cf8',
                      color: '#4338ca',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '3px 9px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Ask Google Gemini 3.6 Flash to rewrite or expand this draft"
                  >
                    <span>✨</span>
                    <span>{showEditAiBox ? 'Hide AI Assistant' : 'Improve with Gemini AI'}</span>
                  </button>
                </div>

                {showEditAiBox && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.35rem' }}>
                      ✨ Google Gemini 3.6 Flash Drafting Assistant
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="What should Gemini improve or write into this draft?"
                        value={editAiPrompt}
                        onChange={(e) => setEditAiPrompt(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateEditAi}
                        disabled={generatingEditAi}
                        className="btn btn-primary btn-sm"
                        style={{ background: '#4f46e5', flexShrink: 0, fontWeight: 700 }}
                      >
                        {generatingEditAi ? 'Writing...' : 'Update Draft →'}
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  className="form-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Draft content in Markdown format..."
                  rows={10}
                  required
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setShowEditAiBox(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
