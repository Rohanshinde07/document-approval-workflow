import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.js';

interface DocItem {
  id: string;
  title: string;
  status: string;
  projectId: string;
  authorId: string;
  updatedAt: string;
  project: { id: string; name: string };
  author: { id: string; name: string; email: string };
  task?: { id: string; title: string };
  currentVersion?: { versionNumber: number; changeSummary?: string };
}

export const AllDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    apiRequest<DocItem[]>('/api/documents')
      .then((data) => setDocuments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading all documents...
      </div>
    );
  }

  if (error) {
    return <div style={{ color: '#dc2626', padding: '2rem' }}>Error loading documents: {error}</div>;
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.author?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.project?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            All Documents Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Search, filter, and track all documents across your active projects in real-time.
          </p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Documents</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{documents.length}</div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>In Review</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{statusCounts['IN_REVIEW'] || 0}</div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>In Approval</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>{statusCounts['IN_APPROVAL'] || 0}</div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Approved & Sealed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{statusCounts['APPROVED'] || 0}</div>
        </div>

        <div style={{ background: 'white', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>Changes / Rejections</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
            {(statusCounts['CHANGES_REQUESTED'] || 0) + (statusCounts['REJECTED'] || 0)}
          </div>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            🔍
          </span>
          <input
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by document title, author, or project..."
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'IN_REVIEW', 'IN_APPROVAL', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? '#2563eb' : '#f8fafc',
                color: statusFilter === st ? 'white' : '#475569',
                border: statusFilter === st ? '1px solid #2563eb' : '1px solid #e2e8f0',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Document Registry</h2>
          <span className="badge badge-in_review">
            {filteredDocs.length} Showing
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>No documents matched your criteria</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Try adjusting your search query or status filter.
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
                  <th>Author</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link to={`/documents/${doc.id}`} style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {doc.title}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/projects/${doc.project?.id}`} style={{ color: '#475569', fontWeight: 500 }}>
                        {doc.project?.name}
                      </Link>
                    </td>
                    <td>
                      <strong>v{doc.currentVersion?.versionNumber || 1}</strong>
                    </td>
                    <td>{doc.author?.name}</td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                      {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
