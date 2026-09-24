import React from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
        backdropFilter: 'blur(4px)',
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
          maxWidth: '780px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.8rem' }}>💡</span>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Sequential Approval Pipeline Guide
              </h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Enterprise 2-Stage Gated Approval Workflow & Compliance Rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            ×
          </button>
        </div>

        {/* Pipeline Stepper Visual */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            4-Stage State Machine Lifecycle
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', borderTop: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✍️</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>1. Draft Creation</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Author creates spec from templates. Editable & private draft.
              </div>
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔍</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>2. Technical Review</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Reviewers evaluate, comment, and choose: <strong>Approve</strong> or <strong>Request Changes</strong>.
              </div>
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🛡️</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>3. Final Sign-off</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Executive Approvers verify review clearance. Choose: <strong>Approve</strong> or <strong>Reject</strong>.
              </div>
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', borderTop: '4px solid #10b981' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>4. Sealed & Approved</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Document is locked, audit-stamped, and published across team.
              </div>
            </div>
          </div>
        </div>

        {/* Key Compliance Rules */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
          🛡️ Enterprise Compliance & Integrity Rules
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.9rem', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              4-Eyes Principle (Rule R4)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              An author can never approve or review their own document. Strict separation of drafting vs verification.
            </div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Mandatory Feedback (Rules R8, R9)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              Requesting revisions or rejecting a document strictly requires a written reason for transparency.
            </div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Immutable Audit Log (Rule R12)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              Every status change, reviewer decision, and timestamp is permanently recorded in the immutable audit trail.
            </div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <div style={{ fontWeight: 700, color: '#6b21a8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Automated Email Dispatch
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              Reviewers and Approvers receive real-time email alerts when a document enters their active decision queue.
            </div>
          </div>
        </div>

        {/* Roles Breakdown */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
          👥 Project Role Capabilities
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Role</th>
              <th style={{ padding: '8px 12px' }}>Permissions</th>
              <th style={{ padding: '8px 12px' }}>Assigned Demo Account</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px' }}><span className="role-badge" style={{ background: '#7c3aed15', color: '#7c3aed' }}>OWNER</span></td>
              <td style={{ padding: '8px 12px' }}>Manage members, invite team, delete project, view all</td>
              <td style={{ padding: '8px 12px' }}><code>rohanyshinde07@gmail.com</code></td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px' }}><span className="role-badge" style={{ background: '#2563eb15', color: '#2563eb' }}>AUTHOR</span></td>
              <td style={{ padding: '8px 12px' }}>Draft documents from templates, create versions, submit</td>
              <td style={{ padding: '8px 12px' }}><code>rohantrueview07@gmail.com</code></td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px' }}><span className="role-badge" style={{ background: '#d9770615', color: '#d97706' }}>REVIEWER</span></td>
              <td style={{ padding: '8px 12px' }}>Stage 2 Technical Review, leave comments, request changes</td>
              <td style={{ padding: '8px 12px' }}><code>rohanyshinde21@gmail.com</code></td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 12px' }}><span className="role-badge" style={{ background: '#16a34a15', color: '#16a34a' }}>APPROVER</span></td>
              <td style={{ padding: '8px 12px' }}>Stage 3 Executive Sign-off, final approval, or rejection</td>
              <td style={{ padding: '8px 12px' }}><code>rohanyogeshshinde0@gmail.com</code></td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px' }}><span className="role-badge" style={{ background: '#64748b15', color: '#64748b' }}>VIEWER</span></td>
              <td style={{ padding: '8px 12px' }}>Read-only access to approved documents and project audit log</td>
              <td style={{ padding: '8px 12px' }}><code>k10xlegit@gmail.com</code></td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
