import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DocumentDetail, DocumentVersion, AuditEvent, DecisionType } from '../types.js';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { AIAuditModal } from '../components/AIAuditModal.js';
import { FileImportDropzone } from '../components/FileImportDropzone.js';

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
  const [copied, setCopied] = useState(false);

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
  const [showAiModal, setShowAiModal] = useState(false);

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

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading document details...</div>;
  if (error) return <div style={{ color: '#dc2626', padding: '2rem' }}>Error loading document: {error}</div>;
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

    if ((decisionType === 'REQUEST_CHANGES' || decisionType === 'REJECT') && !decisionComment.trim()) {
      setActionError(`A comment / reason is required when ${decisionType === 'REJECT' ? 'rejecting' : 'requesting changes on'} a document.`);
      return;
    }

    setDecisionSubmitting(true);

    try {
      await apiRequest(`/api/documents/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: decisionType,
          comment: decisionComment.trim() || undefined,
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
        body: JSON.stringify({
          body: commentBody.trim(),
          versionId: selectedVersion?.id,
        }),
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

  const handleCopyContent = () => {
    if (selectedVersion?.content) {
      navigator.clipboard.writeText(selectedVersion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasAction = (actionName: string) => document.allowedActions.includes(actionName as any);
  const unresolvedCommentsCount = document.comments.filter((c) => !c.resolvedAt).length;

  // Workflow Stepper Logic
  const getStepStatus = (stepKey: string) => {
    const s = document.status;
    if (stepKey === 'DRAFT') {
      return s === 'DRAFT' ? 'current' : 'completed';
    }
    if (stepKey === 'IN_REVIEW') {
      if (s === 'DRAFT') return 'upcoming';
      if (s === 'IN_REVIEW') return 'current';
      if (s === 'CHANGES_REQUESTED') return 'warning';
      return 'completed';
    }
    if (stepKey === 'IN_APPROVAL') {
      if (s === 'DRAFT' || s === 'IN_REVIEW' || s === 'CHANGES_REQUESTED') return 'upcoming';
      if (s === 'IN_APPROVAL') return 'current';
      if (s === 'REJECTED') return 'rejected';
      return 'completed';
    }
    if (stepKey === 'APPROVED') {
      if (s === 'APPROVED') return 'completed';
      if (s === 'REJECTED') return 'rejected';
      return 'upcoming';
    }
    return 'upcoming';
  };

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to={`/projects/${document.projectId}`} style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← Back to Project ({document.project?.name})
        </Link>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {actionError}</span>
          <button
            onClick={() => setActionError('')}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Visual Workflow Pipeline Stepper */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sequential Approval Pipeline
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Status: <strong style={{ color: 'var(--text-main)' }}>{document.status}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {[
            { key: 'DRAFT', label: '1. Draft Creation', desc: 'Author Drafting' },
            { key: 'IN_REVIEW', label: '2. Technical Review', desc: 'Reviewer Feedback' },
            { key: 'IN_APPROVAL', label: '3. Final Sign-off', desc: 'Executive Approval' },
            { key: 'APPROVED', label: '4. Sealed & Approved', desc: 'Audit Stamped' },
          ].map((st, idx, arr) => {
            const stepState = getStepStatus(st.key);
            const isCompleted = stepState === 'completed';
            const isCurrent = stepState === 'current';
            const isWarning = stepState === 'warning';
            const isRejected = stepState === 'rejected';

            let dotColor = '#cbd5e1';
            let dotText = String(idx + 1);
            let textColor = 'var(--text-muted)';

            if (isCompleted) {
              dotColor = '#16a34a';
              dotText = '✓';
              textColor = 'var(--text-main)';
            } else if (isCurrent) {
              dotColor = '#2563eb';
              textColor = '#2563eb';
            } else if (isWarning) {
              dotColor = '#d97706';
              dotText = '!';
              textColor = '#d97706';
            } else if (isRejected) {
              dotColor = '#dc2626';
              dotText = '✕';
              textColor = '#dc2626';
            }

            return (
              <React.Fragment key={st.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 2 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCurrent ? 'white' : dotColor,
                      border: isCurrent ? `3px solid ${dotColor}` : 'none',
                      color: isCurrent ? dotColor : 'white',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {dotText}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontWeight: isCurrent ? 700 : 600, fontSize: '0.8rem', color: textColor }}>
                    {isWarning && st.key === 'IN_REVIEW' ? '2. Changes Requested' : isRejected && st.key === 'APPROVED' ? '4. Rejected' : st.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>{st.desc}</div>
                </div>

                {idx < arr.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '3px',
                      background: isCompleted ? '#16a34a' : isWarning ? '#d97706' : '#e2e8f0',
                      margin: '0 0.5rem 1.25rem',
                      transition: 'background 0.3s',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Role Context Guidance Card */}
      {/* Stage 1 Draft Guidance Banner */}
      {document.status === 'DRAFT' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '1.2rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.6rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
                Stage 1: Draft Mode Active
              </div>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {document.authorId === user?.id ? (
                  <>
                    You are drafting this document. Review content and when ready, click <strong>"Submit for Review"</strong> to assign reviewers and move to Stage 2.
                  </>
                ) : (
                  <>
                    Author (<strong>{document.author?.name}</strong>) is currently preparing this draft. Once they click <strong>"Submit for Review"</strong>, Stage 2 (Technical Review) will unlock and your <strong>Complete Review</strong> buttons will appear here.
                  </>
                )}
              </div>
            </div>
          </div>
          {hasAction('SUBMIT') && (
            <button onClick={handleSubmitDoc} className="btn btn-primary" disabled={submittingAction}>
              {submittingAction ? 'Submitting...' : '🚀 Submit for Review →'}
            </button>
          )}
        </div>
      )}

      {/* Stage 2 Active Review Banner */}
      {document.status === 'IN_REVIEW' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #93c5fd',
            borderRadius: '10px',
            padding: '1.2rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🔍</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>
                Stage 2: Technical Review Active
              </div>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {hasAction('DECIDE_REVIEW') ? (
                  <>
                    You are an assigned <strong>Reviewer</strong>. Please evaluate the content below, add inline comments in <em>Feedback Thread</em> if needed, and complete your review.
                  </>
                ) : (
                  <>Technical reviewers are actively examining this document version.</>
                )}
              </div>
            </div>
          </div>
          {hasAction('DECIDE_REVIEW') && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setDecisionType('APPROVE');
                  setDecisionComment('');
                  setShowDecisionModal(true);
                }}
                className="btn btn-primary"
                style={{ background: '#16a34a', fontWeight: 700 }}
              >
                ✓ Complete Review (Approve)
              </button>
              <button
                onClick={() => {
                  setDecisionType('REQUEST_CHANGES');
                  setDecisionComment('');
                  setShowDecisionModal(true);
                }}
                className="btn btn-secondary"
                style={{ border: '1px solid #d97706', color: '#b45309', fontWeight: 600 }}
              >
                🔄 Request Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Role Context Guidance Card for Changes Requested */}
      {document.status === 'CHANGES_REQUESTED' && document.authorId === user?.id && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️ Action Required: Revisions Requested</span>
              {unresolvedCommentsCount > 0 && (
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                  {unresolvedCommentsCount} Unresolved Feedback
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.35rem' }}>
              Reviewers have requested revisions. Please check the <strong>Feedback Thread</strong> tab, address comments, create a <strong>New Version</strong>, and resubmit.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                setVContent(document.currentVersion?.content || '');
                setVSummary('Addressing reviewer comments');
                setShowVersionModal(true);
              }}
              className="btn btn-secondary btn-sm"
            >
              + Create v{(document.currentVersion?.versionNumber || 1) + 1} Revision
            </button>
            {hasAction('SUBMIT') && (
              <button onClick={handleSubmitDoc} className="btn btn-primary btn-sm" disabled={submittingAction}>
                {submittingAction ? 'Submitting...' : '🚀 Resubmit Document'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{document.title}</h1>
              <StatusBadge status={document.status} />
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <div>Author: <strong>{document.author?.name}</strong></div>
              {document.task && <div>Task: <strong>{document.task.title}</strong></div>}
              <div>Current Version: <strong>v{document.currentVersion?.versionNumber || 1}</strong></div>
              <div>Project: <strong style={{ color: 'var(--accent-blue)' }}>{document.project?.name}</strong></div>
              <div>My Project Role: <span className="role-badge">{document.myRole}</span></div>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ✨ Gemini AI Verification Button */}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                padding: '0.45rem 0.95rem',
              }}
              title="Run automated compliance & risk audit with Google Gemini 3.6 Flash"
            >
              <span>✨</span>
              <span>Verify with AI</span>
            </button>

            <button onClick={handleCopyContent} className="btn btn-secondary btn-sm" title="Copy raw Markdown content">
              {copied ? '✓ Copied' : '📋 Copy Content'}
            </button>

            {hasAction('CREATE_VERSION') && (
              <button
                onClick={() => {
                  setVContent(document.currentVersion?.content || '');
                  setVSummary(`Revision v${(document.currentVersion?.versionNumber || 1) + 1}`);
                  setShowVersionModal(true);
                }}
                className="btn btn-secondary"
              >
                + New Version
              </button>
            )}

            {hasAction('SUBMIT') && (
              <button onClick={handleSubmitDoc} className="btn btn-primary" disabled={submittingAction}>
                {submittingAction
                  ? 'Submitting...'
                  : document.status === 'CHANGES_REQUESTED'
                  ? '🚀 Resubmit Document'
                  : '🚀 Submit for Review'}
              </button>
            )}

            {hasAction('DECIDE_REVIEW') && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setDecisionType('APPROVE');
                    setDecisionComment('');
                    setShowDecisionModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ background: '#16a34a', fontWeight: 700 }}
                >
                  ✓ Complete Review (Approve)
                </button>
                <button
                  onClick={() => {
                    setDecisionType('REQUEST_CHANGES');
                    setDecisionComment('');
                    setShowDecisionModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{ border: '1px solid #d97706', color: '#b45309', fontWeight: 600 }}
                >
                  🔄 Request Changes
                </button>
              </div>
            )}

            {hasAction('DECIDE_APPROVAL') && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setDecisionType('APPROVE');
                    setDecisionComment('');
                    setShowDecisionModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', fontWeight: 700 }}
                >
                  🛡️ Final Sign-off (Approve)
                </button>
                <button
                  onClick={() => {
                    setDecisionType('REJECT');
                    setDecisionComment('');
                    setShowDecisionModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{ border: '1px solid #dc2626', color: '#dc2626', fontWeight: 600 }}
                >
                  ❌ Reject
                </button>
              </div>
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
          Review Assignments ({document.currentRoundAssignments.length})
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Feedback Thread ({document.comments.length})
          {unresolvedCommentsCount > 0 && (
            <span style={{ marginLeft: '0.4rem', background: '#dc2626', color: 'white', borderRadius: '10px', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
              {unresolvedCommentsCount}
            </span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail ({auditEvents.length})
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

          <div style={{ marginBottom: '1.25rem', padding: '0.65rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>Change Summary:</strong> {selectedVersion?.changeSummary || 'Initial version'}
          </div>

          <div className="markdown-body" style={{ minHeight: '200px', lineHeight: 1.7, fontSize: '0.95rem' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {selectedVersion?.content || 'No content recorded.'}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Active Review Round Assignments */}
      {activeTab === 'assignments' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Current Round Review Assignments</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Stage: <strong>{document.status === 'IN_APPROVAL' ? 'APPROVAL (Approver Round)' : 'REVIEW (Technical Review Round)'}</strong>
            </span>
          </div>

          {document.currentRoundAssignments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No assignments recorded yet. Assignments are snapshotted when the author submits the document.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reviewer / Approver</th>
                    <th>Stage</th>
                    <th>Decision Status</th>
                    <th>Decision Comment</th>
                    <th>Decided Date</th>
                  </tr>
                </thead>
                <tbody>
                  {document.currentRoundAssignments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.user?.name || 'User'}</td>
                      <td>
                        <span className="role-badge">{a.stage}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color:
                              a.status === 'APPROVED'
                                ? '#15803d'
                                : a.status === 'CHANGES_REQUESTED'
                                ? '#dc2626'
                                : a.status === 'REJECTED'
                                ? '#be123c'
                                : a.status === 'CANCELLED'
                                ? '#94a3b8'
                                : '#d97706',
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {a.decisionComment || '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {a.decidedAt ? new Date(a.decidedAt).toLocaleString() : 'Pending'}
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
            <h2 className="card-title">Feedback Thread & Resolution Checklist</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {document.comments.length} Comments ({unresolvedCommentsCount} Unresolved)
            </span>
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <textarea
                className="form-textarea"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Leave feedback, review note, or question on this revision..."
                rows={3}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={commentSubmitting}>
                {commentSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {document.comments.map((c) => (
              <div
                key={c.id}
                style={{
                  border: c.resolvedAt ? '1px solid #e2e8f0' : '1px solid rgba(245, 158, 11, 0.4)',
                  background: c.resolvedAt ? '#fafafa' : '#fffbeb',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{c.author?.name || 'User'}</strong>
                    {c.version && (
                      <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        v{c.version.versionNumber}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ margin: '0.25rem 0 0.75rem', color: '#334155', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {c.body}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem' }}>
                  {c.resolvedAt ? (
                    <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✓ Resolved by {c.resolvedBy?.name || 'Author'}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 600 }}>
                      ● Unresolved (Must be resolved before resubmission)
                    </span>
                  )}

                  {!c.resolvedAt && document.authorId === user?.id && (
                    <button
                      onClick={() => handleResolveComment(c.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      Mark Resolved ✓
                    </button>
                  )}
                </div>
              </div>
            ))}

            {document.comments.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
                No feedback comments posted yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Immutable Audit Trail</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Cryptographically timestamped action journal
            </span>
          </div>

          <div className="timeline">
            {auditEvents.map((evt) => (
              <div key={evt.id} className="timeline-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-main)' }}>{evt.actor?.name || 'System'}</span>{' '}
                    <span className="role-badge">{evt.action}</span>
                    {evt.version && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>
                        (Version v{evt.version.versionNumber})
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
                {(evt.fromStatus || evt.toStatus) && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Status transition: <code>{evt.fromStatus || '—'}</code> → <code>{evt.toStatus || '—'}</code>
                  </div>
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
              <button onClick={() => setShowVersionModal(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleCreateVersion}>
              {/* 📁 Upload revised file (.pdf, .docx, .txt, .md) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span>📁</span>
                  <span>Upload Revised Specification File (Optional)</span>
                </label>
                <FileImportDropzone
                  onFileLoaded={({ content, suggestedTitle }) => {
                    setVContent(content);
                    if (!vSummary) setVSummary(`Updated from ${suggestedTitle}`);
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Version Content (Markdown)</label>
                <textarea
                  className="form-textarea"
                  value={vContent}
                  onChange={(e) => setVContent(e.target.value)}
                  placeholder="Paste or write revised document content..."
                  rows={9}
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
                <button type="button" onClick={() => setShowVersionModal(false)} className="btn btn-secondary">
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
              <h3 className="modal-title">
                {document.status === 'IN_APPROVAL' ? '🛡️ Final Executive Decision' : '⚖ Record Review Decision'}
              </h3>
              <button onClick={() => setShowDecisionModal(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleRecordDecision}>
              {actionError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                  <span style={{ fontWeight: 600 }}>{actionError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Your Decision</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVE"
                      checked={decisionType === 'APPROVE'}
                      onChange={() => {
                        setDecisionType('APPROVE');
                        if (actionError) setActionError('');
                      }}
                    />
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>
                      {document.status === 'IN_APPROVAL' ? 'Grant Final Approval' : 'Approve Review'}
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="REQUEST_CHANGES"
                      checked={decisionType === 'REQUEST_CHANGES'}
                      onChange={() => {
                        setDecisionType('REQUEST_CHANGES');
                        if (actionError) setActionError('');
                      }}
                    />
                    <span style={{ color: '#d97706', fontWeight: 700 }}>Request Changes</span>
                  </label>

                  {document.status === 'IN_APPROVAL' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="decision"
                        value="REJECT"
                        checked={decisionType === 'REJECT'}
                        onChange={() => {
                          setDecisionType('REJECT');
                          if (actionError) setActionError('');
                        }}
                      />
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>Reject Document</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Feedback / Justification Notes{' '}
                    {decisionType === 'REQUEST_CHANGES' ? (
                      <strong style={{ color: '#dc2626' }}>(Mandatory: Revisions required)</strong>
                    ) : decisionType === 'REJECT' ? (
                      <strong style={{ color: '#dc2626' }}>(Mandatory: Rejection reason required)</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    )}
                  </label>
                </div>

                {decisionType === 'REJECT' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>Quick reason:</span>
                    {[
                      'Strategic direction changed',
                      'Budget constraints',
                      'Technical architecture mismatch',
                      'Initiative cancelled',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => {
                          setDecisionComment(reason);
                          if (actionError) setActionError('');
                        }}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#b91c1c',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        + {reason}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  className="form-textarea"
                  value={decisionComment}
                  onChange={(e) => {
                    setDecisionComment(e.target.value);
                    if (actionError) setActionError('');
                  }}
                  placeholder={
                    decisionType === 'REQUEST_CHANGES'
                      ? 'Specify exactly what needs to be changed before you can approve...'
                      : decisionType === 'REJECT'
                      ? 'Please specify why this document is being rejected (e.g. Budget constraints, initiative cancelled)...'
                      : 'Add any optional sign-off remarks or guidance...'
                  }
                  rows={4}
                  required={decisionType === 'REQUEST_CHANGES' || decisionType === 'REJECT'}
                  autoFocus={decisionType === 'REQUEST_CHANGES' || decisionType === 'REJECT'}
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowDecisionModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={decisionSubmitting}
                  style={{
                    background:
                      decisionType === 'APPROVE'
                        ? 'linear-gradient(135deg, #15803d, #16a34a)'
                        : decisionType === 'REQUEST_CHANGES'
                        ? 'linear-gradient(135deg, #d97706, #ea580c)'
                        : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  }}
                >
                  {decisionSubmitting ? 'Recording...' : `Confirm ${decisionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✨ Google Gemini AI Verification Modal */}
      <AIAuditModal
        documentId={document.id}
        documentTitle={document.title}
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplyRecommendation={(note) => {
          setDecisionComment(note);
          setShowDecisionModal(true);
        }}
      />
    </div>
  );
};

