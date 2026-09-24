import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../api/client.js';

export interface AIAuditResult {
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  recommendation: 'RECOMMEND_APPROVAL' | 'RECOMMEND_REVISION' | 'NEEDS_DISCUSSION';
  recommendationReason: string;
  checklist: Array<{
    criterion: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    details: string;
  }>;
  actionableSuggestions: string[];
  analyzedAt: string;
  model: string;
}

interface AIAuditModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyRecommendation?: (text: string) => void;
}

export const AIAuditModal: React.FC<AIAuditModalProps> = ({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onApplyRecommendation,
}) => {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AIAuditResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Trigger audit on open if not already loaded
  React.useEffect(() => {
    if (isOpen && !audit && !loading) {
      runAudit();
    }
  }, [isOpen, documentId]);

  const runAudit = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<AIAuditResult>(`/api/ai/audit/${documentId}`, {
        method: 'POST',
      });
      setAudit(result);
    } catch (err: any) {
      setError(err.message || 'Failed to complete AI verification');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return { label: 'Low Risk', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: '🛡️' };
      case 'MEDIUM':
        return { label: 'Medium Risk (Advisory)', bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: '⚠️' };
      case 'HIGH':
      default:
        return { label: 'High Risk (Attention Needed)', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '🚨' };
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'RECOMMEND_APPROVAL':
        return { text: '✓ Recommended for Approval', bg: '#10b981', color: 'white' };
      case 'RECOMMEND_REVISION':
        return { text: '⚠️ Revision Advised Before Sign-off', bg: '#f59e0b', color: 'white' };
      case 'NEEDS_DISCUSSION':
      default:
        return { text: '💬 Stakeholder Discussion Suggested', bg: '#6366f1', color: 'white' };
    }
  };

  const riskBadge = audit ? getRiskBadge(audit.riskLevel) : null;
  const recBadge = audit ? getRecommendationBadge(audit.recommendation) : null;

  const handleCopyRecommendation = () => {
    if (!audit) return;
    const commentText = `[AI Verification - ${audit.model}]\nVerdict: ${audit.recommendation}\nReason: ${audit.recommendationReason}\n\nKey Suggestions:\n${audit.actionableSuggestions.map((s) => `• ${s}`).join('\n')}`;
    navigator.clipboard.writeText(commentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onApplyRecommendation) {
      onApplyRecommendation(commentText);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '2rem',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              ✨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  AI Verification & Compliance Audit
                </h2>
                <span
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#4f46e5',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  Gemini 3.6 Flash
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Automated risk assessment, executive briefing & 4-Eyes compliance check for "{documentTitle}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#94a3b8',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content Area */}
        {loading && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1.25rem',
                border: '4px solid #e2e8f0',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
              Analyzing Document with Google Gemini...
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Auditing specifications against enterprise quality standards, clarity benchmarks, and compliance rules.
            </p>
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '1.25rem',
              borderRadius: '10px',
              color: '#dc2626',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Audit Failed</div>
            <div style={{ fontSize: '0.85rem' }}>{error}</div>
            <button
              onClick={runAudit}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.75rem' }}
            >
              Retry Verification
            </button>
          </div>
        )}

        {audit && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top Score Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                  Risk Assessment Verdict
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem' }}>
                  <span
                    style={{
                      background: riskBadge?.bg,
                      color: riskBadge?.color,
                      border: `1px solid ${riskBadge?.border}`,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{riskBadge?.icon}</span>
                    <span>{riskBadge?.label}</span>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Risk Index: <strong>{audit.riskScore}/100</strong>
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Workflow Recommendation
                </div>
                <div style={{ marginTop: '0.35rem', textAlign: 'right' }}>
                  <span
                    style={{
                      background: recBadge?.bg,
                      color: recBadge?.color,
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                    }}
                  >
                    {recBadge?.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation Detail */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                border: '1px solid #e0e7ff',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                💡 Reviewer Guidance & Justification
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.5 }}>
                {audit.recommendationReason}
              </p>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                📌 Executive Briefing
              </h3>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  color: '#334155',
                  lineHeight: 1.6,
                }}
              >
                {audit.summary}
              </div>
            </div>

            {/* Compliance Checklist */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.65rem' }}>
                🛡️ Enterprise Criteria Checklist
              </h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Criterion</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569', width: '90px' }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Analysis Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.checklist.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < audit.checklist.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.criterion}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              background: item.status === 'PASS' ? '#dcfce7' : item.status === 'WARN' ? '#fef3c7' : '#fee2e2',
                              color: item.status === 'PASS' ? '#15803d' : item.status === 'WARN' ? '#b45309' : '#b91c1c',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actionable Suggestions */}
            {audit.actionableSuggestions.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  ✍️ Suggested Improvements for Author
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {audit.actionableSuggestions.map((sug, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1.25rem',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={runAudit}
                  className="btn btn-secondary btn-sm"
                  title="Run fresh audit with Gemini"
                >
                  🔄 Re-run Analysis
                </button>
                <button
                  type="button"
                  onClick={handleCopyRecommendation}
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: copied ? '#ecfdf5' : undefined,
                    color: copied ? '#059669' : undefined,
                    borderColor: copied ? '#a7f3d0' : undefined,
                  }}
                >
                  {copied ? '✓ Copied to Clipboard!' : '📋 Copy to Decision Note'}
                </button>
              </div>

              <button type="button" onClick={onClose} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
