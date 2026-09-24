import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';

interface SLATimerBadgeProps {
  documentId: string;
  status: string;
  startTime: string;
  canNudge?: boolean;
}

export const SLATimerBadge: React.FC<SLATimerBadgeProps> = ({
  documentId,
  status,
  startTime,
  canNudge = false,
}) => {
  if (status !== 'IN_REVIEW' && status !== 'IN_APPROVAL') {
    return null;
  }

  const SLA_HOURS = status === 'IN_REVIEW' ? 48 : 24;
  const [nudging, setNudging] = useState(false);
  const [nudgeResult, setNudgeResult] = useState<string | null>(null);

  // Calculate SLA countdown
  const startMs = new Date(startTime).getTime();
  const deadlineMs = startMs + SLA_HOURS * 3600 * 1000;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = deadlineMs - now;
  const isOverdue = remainingMs <= 0;

  const totalMinutes = Math.abs(Math.floor(remainingMs / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const handleNudge = async () => {
    setNudging(true);
    try {
      const res = await apiRequest<{ message: string; notified: string[] }>(`/api/documents/${documentId}/nudge`, {
        method: 'POST',
      });
      setNudgeResult(res.message);
      setTimeout(() => setNudgeResult(null), 4000);
    } catch (err: any) {
      alert(`Nudge failed: ${err.message}`);
    } finally {
      setNudging(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: 700,
          background: isOverdue ? 'rgba(239, 68, 68, 0.12)' : hours <= 12 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.1)',
          color: isOverdue ? '#dc2626' : hours <= 12 ? '#b45309' : '#1d4ed8',
          border: `1px solid ${isOverdue ? '#fca5a5' : hours <= 12 ? '#fde68a' : '#bfdbfe'}`,
          letterSpacing: '0.01em',
        }}
        title={
          isOverdue
            ? `Review deadline exceeded by ${hours} hours`
            : `${hours} hours and ${minutes} minutes remaining before SLA deadline`
        }
      >
        <span>{isOverdue ? '🚨' : hours <= 12 ? '⚠️' : '⏱️'}</span>
        <span>
          {isOverdue ? `SLA Overdue by ${hours}h ${minutes}m` : `SLA: ${hours}h ${minutes}m left`}
        </span>
      </div>

      {canNudge && (
        <button
          onClick={handleNudge}
          disabled={nudging}
          className="btn btn-secondary btn-sm"
          style={{
            padding: '0.25rem 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            borderColor: isOverdue ? '#ef4444' : 'rgba(37,99,235,0.3)',
            color: isOverdue ? '#dc2626' : 'var(--accent-blue)',
          }}
          title="Send SLA reminder ping to assigned reviewers"
        >
          <span>🔔</span>
          <span>{nudging ? 'Pinging...' : 'SLA Nudge'}</span>
        </button>
      )}

      {nudgeResult && (
        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
          ✓ {nudgeResult}
        </span>
      )}
    </div>
  );
};
