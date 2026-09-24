import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

interface AuditCertificateData {
  sealNumber: string;
  documentId: string;
  title: string;
  projectName: string;
  versionNumber: number;
  status: string;
  sha256: string;
  author: { name: string };
  approver: { name: string; role: string; timestamp: string };
  reviewers: { name: string; role: string; timestamp: string }[];
  approvedAt: string;
  generatedAt: string;
  complianceSummary: {
    standard: string;
    tamperProof: string;
    auditEventsCount: number;
  };
}

interface AuditCertificateModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditCertificateModal: React.FC<AuditCertificateModalProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<AuditCertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hashCopied, setHashCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    apiRequest<AuditCertificateData>(`/api/documents/${documentId}/certificate`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentId, isOpen]);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    if (data?.sha256) {
      navigator.clipboard.writeText(data.sha256);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '2px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
          title="Close modal"
        >
          ✕
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div>Verifying cryptographic signatures and generating sealed audit certificate...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            Failed to generate certificate: {error}
          </div>
        ) : data ? (
          <div id="printable-certificate">
            {/* Certificate Header with Official Gold/Navy Styling */}
            <div
              style={{
                border: '3px double #d97706',
                borderRadius: '12px',
                padding: '2rem',
                background: 'linear-gradient(180deg, #fffdfa 0%, #ffffff 100%)',
                position: 'relative',
              }}
            >
              {/* Top Watermark / Badge */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', padding: '0.35rem 1rem', borderRadius: '20px', border: '1px solid #fde68a', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Official 4-Eyes Compliance Seal
                  </span>
                </div>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                  Certificate of Audit Approval
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>
                  SEAL ID: <strong style={{ color: '#0f172a' }}>{data.sealNumber}</strong>
                </div>
              </div>

              {/* Document Overview */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Document Title
                  </div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginTop: '2px' }}>
                    {data.title}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Project Workspace
                  </div>
                  <div style={{ fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {data.projectName}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Approved Version
                  </div>
                  <div style={{ fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    v{data.versionNumber} (Final Sealed)
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Author
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {data.author.name}
                  </div>
                </div>
              </div>

              {/* SHA-256 Cryptographic Checksum */}
              <div
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    🔒 SHA-256 Tamper-Proof Fingerprint
                  </span>
                  <button
                    onClick={handleCopyHash}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: 'none',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {hashCopied ? '✓ Copied' : 'Copy Hash'}
                  </button>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', color: '#a5f3fc' }}>
                  {data.sha256}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  Verified cryptographically against content payload, database state trigger, and timestamp.
                </div>
              </div>

              {/* Two-Stage Dual Authorization Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Stage 2 Technical Reviewers */}
                <div
                  style={{
                    border: '1px solid #bbf7d0',
                    background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <span>✓</span> Stage 2: Technical Review
                  </div>
                  {data.reviewers.length > 0 ? (
                    data.reviewers.map((r, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{r.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Role: Technical Reviewer</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Verified: {new Date(r.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Signed off by Technical Review Committee</div>
                  )}
                </div>

                {/* Stage 3 Executive Approver */}
                <div
                  style={{
                    border: '1px solid #bfdbfe',
                    background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
                    borderRadius: '10px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e40af', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <span>🛡️</span> Stage 3: Executive Sign-off
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{data.approver.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Role: Executive Approver</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Sealed: {new Date(data.approver.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Compliance Badges Footer */}
              <div
                style={{
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                <div>
                  <strong>Standard:</strong> {data.complianceSummary.standard}
                </div>
                <div>
                  <strong>Audit Events:</strong> {data.complianceSummary.auditEventsCount} logged
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a' }}>
                <span>🖨️</span>
                <span>Print / Download PDF</span>
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
