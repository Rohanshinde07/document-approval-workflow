import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DocumentDetail, DocumentVersion, AuditEvent, DecisionType } from '../types.js';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments' | 'comments' | 'audit'>('content');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals / Action states
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [vContent, setVContent] = useState('');
  const [vSummary, setVSummary] = useState('');
  const [vSubmitting, setVSubmitting] = useState(false);

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<DecisionType>('APPROVE');
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = () => {
    if (!id) return;
    Promise.all([
      apiRequest<DocumentDetail>(`/api/documents/${id}`),
      apiRequest<AuditEvent[]>(`/api/documents/${id}/audit`),
    ])
      .then(([docData, auditData]) => {
        setDocument(docData);
        setAuditEvents(auditData);
        if (docData.currentVersion) {
          setSelectedVersion(docData.currentVersion);
        } else if (docData.versions.length > 0) {
          setSelectedVersion(docData.versions[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading document...</div>;
  if (error) return <div style={{ color: '#f87171', padding: '2rem' }}>Error loading document: {error}</div>;
  if (!document) return null;

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setVSubmitting(true);

    try {
      await apiRequest(`/api/documents/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify({
          content: vContent,
          changeSummary: vSummary || 'New version revision',
        }),
      });

      setShowVersionModal(false);
      setVContent('');
      setVSummary('');
      loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setVSubmitting(false);
    }
  };

  const handleSubmitDoc = async () => {
    setActionError('');
    setSubmittingAction(true);

    try {
      await apiRequest(`/api/documents/${id}/submit`, {
        method: 'POST',
      });
      loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setDecisionSubmitting(true);

    try {
      await apiRequest(`/api/documents/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: decisionType,
          comment: decisionComment || undefined,
        }),
      });

      setShowDecisionModal(false);
      setDecisionComment('');
      loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setCommentSubmitting(true);

    try {
      await apiRequest(`/api/documents/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody }),
      });

      setCommentBody('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await apiRequest(`/api/comments/${commentId}/resolve`, {
        method: 'POST',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const hasAction = (actionName: string) => document.allowedActions.includes(actionName as any);

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to={`/projects/${document.projectId}`} style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          ← Back to Project ({document.project?.name})
        </Link>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionError}</span>
          <button
            onClick={() => setActionError('')}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{document.title}</h1>
              <StatusBadge status={document.status} />
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <div>Author: <strong>{document.author?.name}</strong></div>
              {document.task && <div>Task: <strong>{document.task.title}</strong></div>}
              <div>Current Version: <strong>v{document.currentVersion?.versionNumber || 1}</strong></div>
              <div>My Role: <span className="role-badge">{document.myRole}</span></div>
            </div>
          </div>

          {/* Render Contextual Action Buttons from allowedActions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {hasAction('CREATE_VERSION') && (
              <button onClick={() => setShowVersionModal(true)} className="btn btn-secondary">
                + New Version
              </button>
            )}

            {hasAction('SUBMIT') && (
              <button onClick={handleSubmitDoc} className="btn btn-primary" disabled={submittingAction}>
                {submittingAction
                  ? 'Submitting...'
                  : document.status === 'CHANGES_REQUESTED'
                  ? 'Resubmit Document'
                  : 'Submit for Review'}
              </button>
            )}

            {(hasAction('DECIDE_REVIEW') || hasAction('DECIDE_APPROVAL')) && (
              <button
                onClick={() => {
                  setDecisionType('APPROVE');
                  setDecisionComment('');
                  setShowDecisionModal(true);
                }}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
              >
                ⚖ Record Decision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Document Content
        </button>
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Active Review Round ({document.currentRoundAssignments.length})
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Feedback Thread ({document.comments.length})
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Timeline ({auditEvents.length})
        </button>
      </div>

      {/* Tab: Content & Version Reader */}
      {activeTab === 'content' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="card-title">
                Viewing Version v{selectedVersion?.versionNumber || 1}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Created by {selectedVersion?.createdBy?.name || document.author?.name} on{' '}
                {selectedVersion && new Date(selectedVersion.createdAt).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Version:</label>
              <select
                className="form-select"
                value={selectedVersion?.versionNumber || 1}
                onChange={(e) => {
                  const verNum = parseInt(e.target.value, 10);
                  const found = document.versions.find((v) => v.versionNumber === verNum);
                  if (found) setSelectedVersion(found);
                }}
                style={{ width: 'auto', padding: '0.35rem 0.65rem' }}
              >
                {document.versions.map((v) => (
                  <option key={v.id} value={v.versionNumber}>
                    v{v.versionNumber} ({v.changeSummary || 'Revision'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <strong>Change Summary:</strong> {selectedVersion?.changeSummary || 'N/A'}
          </div>

          <div className="markdown-body">
            {selectedVersion?.content || 'No content recorded.'}
          </div>
        </div>
      )}

      {/* Tab: Active Review Round Assignments */}
      {activeTab === 'assignments' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Review & Approval Assignments Matrix</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Snapshotted for Version v{document.currentVersion?.versionNumber || 1}
            </span>
          </div>

          {document.currentRoundAssignments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No assignments have been created for the current version yet. Submit the document to launch a review round.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Assigned User</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Decided Date</th>
                    <th>Decision Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {document.currentRoundAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td style={{ fontWeight: 600 }}>{assignment.user?.name}</td>
                      <td>
                        <span className="role-badge">{assignment.stage}</span>
                      </td>
                      <td>
                        <StatusBadge status={assignment.status} />
                      </td>
                      <td>
                        {assignment.decidedAt
                          ? new Date(assignment.decidedAt).toLocaleString()
                          : 'Pending'}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {assignment.decisionComment || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Comments & Feedback Thread */}
      {activeTab === 'comments' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Feedback & Change Requests</h2>
          </div>

          {document.comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
              No comments have been posted yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {document.comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>{comment.author?.name}</strong>{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        on version v{comment.version?.versionNumber || 1} • {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {comment.resolvedAt ? (
                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                        Resolved in v{comment.resolvedInVersion?.versionNumber || 'current'} by {comment.resolvedBy?.name}
                      </span>
                    ) : (
                      <span className="badge badge-changes_requested" style={{ fontSize: '0.7rem' }}>
                        Unresolved
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.925rem', whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
                    {comment.body}
                  </p>

                  {/* Resolution action for document author */}
                  {!comment.resolvedAt && hasAction('RESOLVE_COMMENT') && (
                    <button
                      onClick={() => handleResolveComment(comment.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      ✓ Mark Resolved in Current Version
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form */}
          {hasAction('ADD_COMMENT') && (
            <form onSubmit={handleAddComment} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Add Feedback Comment</label>
                <textarea
                  className="form-textarea"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Enter feedback or question on current version..."
                  rows={3}
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={commentSubmitting}>
                {commentSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab: Audit Log Timeline */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Immutable Audit Trail</h2>
          </div>

          <div className="timeline">
            {auditEvents.map((evt) => (
              <div key={evt.id} className="timeline-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {evt.actor?.name}{' '}
                    <span className="role-badge" style={{ marginLeft: '0.35rem' }}>
                      {evt.action}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>

                {(evt.fromStatus || evt.toStatus) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Status Transition: <code>{evt.fromStatus || 'N/A'}</code> → <code>{evt.toStatus || 'N/A'}</code>
                  </div>
                )}

                {evt.metadata && (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      background: '#0f172a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.4rem',
                      color: 'var(--text-muted)',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(evt.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Version */}
      {showVersionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create New Document Version</h3>
              <button onClick={() => setShowVersionModal(false)} className="modal-close">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateVersion}>
              <div className="form-group">
                <label className="form-label">Version Content (Markdown)</label>
                <textarea
                  className="form-textarea"
                  value={vContent}
                  onChange={(e) => setVContent(e.target.value)}
                  placeholder="Paste or write revised document content..."
                  rows={8}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Change Summary</label>
                <input
                  type="text"
                  className="form-input"
                  value={vSummary}
                  onChange={(e) => setVSummary(e.target.value)}
                  placeholder="e.g. Addressed payment terms in section 3"
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={vSubmitting}>
                  {vSubmitting ? 'Creating Version...' : 'Save New Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Decision */}
      {showDecisionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Record Review / Approval Decision</h3>
              <button onClick={() => setShowDecisionModal(false)} className="modal-close">
                ×
              </button>
            </div>

            <form onSubmit={handleRecordDecision}>
              <div className="form-group">
                <label className="form-label">Select Your Decision</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVE"
                      checked={decisionType === 'APPROVE'}
                      onChange={() => setDecisionType('APPROVE')}
                    />
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>Approve</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="REQUEST_CHANGES"
                      checked={decisionType === 'REQUEST_CHANGES'}
                      onChange={() => setDecisionType('REQUEST_CHANGES')}
                    />
                    <span style={{ color: '#f87171', fontWeight: 600 }}>Request Changes</span>
                  </label>

                  {document.status === 'IN_APPROVAL' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="decision"
                        value="REJECT"
                        checked={decisionType === 'REJECT'}
                        onChange={() => setDecisionType('REJECT')}
                      />
                      <span style={{ color: '#fb7185', fontWeight: 600 }}>Reject Document</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Decision Comment {decisionType !== 'APPROVE' && <span style={{ color: '#f87171' }}>* (Required)</span>}
                </label>
                <textarea
                  className="form-textarea"
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={
                    decisionType === 'APPROVE'
                      ? 'Optional approval comment...'
                      : 'Specify required changes or reason for rejection...'
                  }
                  rows={4}
                  required={decisionType !== 'APPROVE'}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={decisionSubmitting}>
                  {decisionSubmitting ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
