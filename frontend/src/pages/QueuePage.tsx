import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserQueue } from '../types.js';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';

export const QueuePage: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<UserQueue | null>(null);
  const [projectsCount, setProjectsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'reviews' | 'approvals' | 'changes' | 'mydocs'>('all');

  const reviewsRef = useRef<HTMLDivElement>(null);
  const changesRef = useRef<HTMLDivElement>(null);
  const myDocsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<UserQueue>('/api/me/queue'),
      apiRequest<any[]>('/api/projects'),
    ])
      .then(([queueData, projectsData]) => {
        setQueue(queueData);
        setProjectsCount(projectsData.length);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your dashboard queue...</div>;
  if (error) return <div style={{ color: '#f87171', padding: '2rem' }}>Error loading queue: {error}</div>;

  const awaitingReviews = queue?.awaitingDecision.filter((item) => item.stage === 'REVIEW') || [];
  const awaitingApprovals = queue?.awaitingDecision.filter((item) => item.stage === 'APPROVAL') || [];
  const needingChanges = queue?.needingChanges || [];
  const myDocuments = queue?.myDocuments || [];

  const handleMetricCardClick = (filter: 'reviews' | 'approvals' | 'changes' | 'mydocs' | 'all') => {
    setActiveFilter(filter);
    // Scroll to the relevant section
    setTimeout(() => {
      if ((filter === 'reviews' || filter === 'approvals') && reviewsRef.current) {
        reviewsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (filter === 'changes' && changesRef.current) {
        changesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (filter === 'mydocs' && myDocsRef.current) {
        myDocsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const getFilteredDecisions = () => {
    if (!queue) return [];
    if (activeFilter === 'reviews') return awaitingReviews;
    if (activeFilter === 'approvals') return awaitingApprovals;
    return queue.awaitingDecision;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
          Here is your real-time workflow queue and pending decision overview.
        </p>
      </div>

      {/* Summary Metrics Grid - Now Clickable */}
      <div className="metrics-grid">
        <div
          id="metric-reviews"
          className={`metric-card metric-card-clickable ${activeFilter === 'reviews' ? 'metric-card-active' : ''}`}
          onClick={() => handleMetricCardClick('reviews')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleMetricCardClick('reviews')}
          title="Click to filter pending reviews"
        >
          <div>
            <div className="metric-title">Pending Reviews</div>
            <div className="metric-value">{awaitingReviews.length}</div>
            <div className="metric-action-hint">Click to view →</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            🔍
          </div>
        </div>

        <div
          id="metric-approvals"
          className={`metric-card metric-card-clickable ${activeFilter === 'approvals' ? 'metric-card-active' : ''}`}
          onClick={() => handleMetricCardClick('approvals')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleMetricCardClick('approvals')}
          title="Click to filter pending approvals"
        >
          <div>
            <div className="metric-title">Pending Approvals</div>
            <div className="metric-value">{awaitingApprovals.length}</div>
            <div className="metric-action-hint">Click to view →</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            ⚖
          </div>
        </div>

        <div
          id="metric-changes"
          className={`metric-card metric-card-clickable ${activeFilter === 'changes' ? 'metric-card-active' : ''}`}
          onClick={() => handleMetricCardClick('changes')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleMetricCardClick('changes')}
          title="Click to view documents needing revisions"
        >
          <div>
            <div className="metric-title">Revisions Needed</div>
            <div className="metric-value">{needingChanges.length}</div>
            <div className="metric-action-hint">Click to view →</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            ✍
          </div>
        </div>

        <div
          id="metric-mydocs"
          className={`metric-card metric-card-clickable ${activeFilter === 'mydocs' ? 'metric-card-active' : ''}`}
          onClick={() => handleMetricCardClick('mydocs')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleMetricCardClick('mydocs')}
          title="Click to view documents you authored"
        >
          <div>
            <div className="metric-title">My Documents</div>
            <div className="metric-value">{myDocuments.length}</div>
            <div className="metric-action-hint">In pipeline →</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
            📄
          </div>
        </div>

        <div
          id="metric-projects"
          className={`metric-card metric-card-clickable ${activeFilter === 'all' ? 'metric-card-active' : ''}`}
          onClick={() => handleMetricCardClick('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleMetricCardClick('all')}
          title="Click to view all items"
        >
          <div>
            <div className="metric-title">Active Projects</div>
            <div className="metric-value">{projectsCount}</div>
            <div className="metric-action-hint">Show all →</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            📂
          </div>
        </div>
      </div>

      {/* Active Filter Banner */}
      {activeFilter !== 'all' && (
        <div
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--border-hover)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '0.9rem' }}>
            🔎 Filtering:{' '}
            {activeFilter === 'reviews' && 'Pending Reviews only'}
            {activeFilter === 'approvals' && 'Pending Approvals only'}
            {activeFilter === 'changes' && 'Documents Needing Revisions only'}
            {activeFilter === 'mydocs' && 'My Authored Documents only'}
          </span>
          <button
            onClick={() => setActiveFilter('all')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            ✕ Clear Filter
          </button>
        </div>
      )}

      {/* Awaiting My Decision */}
      {activeFilter !== 'changes' && activeFilter !== 'mydocs' && (
        <div className="card" ref={reviewsRef}>
          <div className="card-header">
            <h2 className="card-title">
              {activeFilter === 'reviews' && 'Awaiting My Review'}
              {activeFilter === 'approvals' && 'Awaiting My Approval'}
              {activeFilter === 'all' && 'Awaiting My Review & Approval'}
            </h2>
            <span className="badge badge-in_review">
              {getFilteredDecisions().length} Pending Items
            </span>
          </div>

          {getFilteredDecisions().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
              <div style={{ fontWeight: 600 }}>All Caught Up!</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                No documents currently require your{' '}
                {activeFilter === 'reviews' ? 'review' : activeFilter === 'approvals' ? 'approval' : 'review or final approval'}.
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Project</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredDecisions().map((item) => (
                    <tr key={item.assignmentId}>
                      <td>
                        <Link to={`/documents/${item.document.id}`} style={{ fontWeight: 700 }}>
                          {item.document.title}
                        </Link>
                      </td>
                      <td>{item.document.project?.name}</td>
                      <td>
                        <span className="role-badge">{item.stage}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.document.status} />
                      </td>
                      <td>{item.document.author?.name}</td>
                      <td>
                        <Link to={`/documents/${item.document.id}`} className="btn btn-primary btn-sm">
                          Review Now →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* My Authored Documents */}
      {activeFilter !== 'reviews' && activeFilter !== 'approvals' && activeFilter !== 'changes' && (
        <div className="card" ref={myDocsRef} style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">My Authored Documents</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                All documents you authored and their live status in the sequential pipeline.
              </p>
            </div>
            <span className="badge badge-in_review">
              {myDocuments.length} Documents
            </span>
          </div>

          {myDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
              <div style={{ fontWeight: 600 }}>No Documents Authored Yet</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                You haven't authored any documents yet. Open a project to create your first document.
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Project</th>
                    <th>Version</th>
                    <th>Pipeline Status</th>
                    <th>Current Workflow Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myDocuments.map((doc) => {
                    let stageInfo = 'Stage 1: Author Drafting';
                    let stageColor = '#64748b';
                    if (doc.status === 'IN_REVIEW') {
                      stageInfo = 'Stage 2: Technical Review (Awaiting Reviewers)';
                      stageColor = '#d97706';
                    } else if (doc.status === 'IN_APPROVAL') {
                      stageInfo = 'Stage 3: Final Sign-off (Awaiting Approvers)';
                      stageColor = '#2563eb';
                    } else if (doc.status === 'CHANGES_REQUESTED') {
                      stageInfo = '⚠️ Revisions Requested (Action Required by You)';
                      stageColor = '#dc2626';
                    } else if (doc.status === 'APPROVED') {
                      stageInfo = '✓ Stage 4: Sealed & Approved';
                      stageColor = '#16a34a';
                    }

                    return (
                      <tr key={doc.id}>
                        <td>
                          <Link to={`/documents/${doc.id}`} style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                            {doc.title}
                          </Link>
                        </td>
                        <td>{doc.project?.name}</td>
                        <td>
                          <strong>v{doc.currentVersion?.versionNumber || 1}</strong>
                        </td>
                        <td>
                          <StatusBadge status={doc.status} />
                        </td>
                        <td style={{ fontSize: '0.85rem', color: stageColor, fontWeight: 600 }}>
                          {stageInfo}
                        </td>
                        <td>
                          <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-sm">
                            Open Document →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Needing Changes */}
      {activeFilter !== 'reviews' && activeFilter !== 'approvals' && (
        <div className="card" ref={changesRef}>
          <div className="card-header">
            <h2 className="card-title">My Documents Needing Revisions</h2>
            <span className="badge badge-changes_requested">
              {queue?.needingChanges.length || 0} Action Required
            </span>
          </div>

          {!queue || queue.needingChanges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👍</div>
              <div style={{ fontWeight: 600 }}>No Revisions Pending</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                None of your authored documents require changes right now.
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Project</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.needingChanges.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <Link to={`/documents/${doc.id}`} style={{ fontWeight: 700 }}>
                          {doc.title}
                        </Link>
                      </td>
                      <td>{doc.project?.name}</td>
                      <td>{doc.task?.title || '—'}</td>
                      <td>
                        <StatusBadge status={doc.status} />
                      </td>
                      <td>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-sm">
                          Revise & Resubmit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
