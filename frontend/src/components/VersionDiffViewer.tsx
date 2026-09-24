import React, { useState, useMemo } from 'react';
import { DocumentVersion } from '../types.js';
import { computeLineDiff } from '../utils/diff.js';

interface VersionDiffViewerProps {
  versions: DocumentVersion[];
  currentVersionId?: string;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({ versions, currentVersionId }) => {
  if (!versions || versions.length < 2) {
    return (
      <div
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>Single Version Document</div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
          This document only has version 1 so far. Once an Author creates a revision or new version, you can compare changes side-by-side.
        </div>
      </div>
    );
  }

  // Sort versions descending
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  // Default: Compare latest version (V_new) with the one before it (V_old)
  const defaultNewId = sortedVersions[0].id;
  const defaultOldId = sortedVersions[1].id;

  const [oldVersionId, setOldVersionId] = useState<string>(defaultOldId);
  const [newVersionId, setNewVersionId] = useState<string>(defaultNewId);
  const [diffMode, setDiffMode] = useState<'split' | 'unified'>('split');

  const oldVersion = versions.find((v) => v.id === oldVersionId) || sortedVersions[1];
  const newVersion = versions.find((v) => v.id === newVersionId) || sortedVersions[0];

  const { lines, stats } = useMemo(() => {
    return computeLineDiff(oldVersion.content, newVersion.content);
  }, [oldVersion.content, newVersion.content]);

  // Split lines for side-by-side rendering
  const splitRows = useMemo(() => {
    const rows: { left?: { num?: number; text: string; type: 'removed' | 'unchanged' }; right?: { num?: number; text: string; type: 'added' | 'unchanged' } }[] = [];
    let lIdx = 0;
    while (lIdx < lines.length) {
      const line = lines[lIdx];
      if (line.type === 'unchanged') {
        rows.push({
          left: { num: line.oldLineNumber, text: line.text, type: 'unchanged' },
          right: { num: line.newLineNumber, text: line.text, type: 'unchanged' },
        });
        lIdx++;
      } else if (line.type === 'removed') {
        // Check if next line is an addition (modification)
        if (lIdx + 1 < lines.length && lines[lIdx + 1].type === 'added') {
          rows.push({
            left: { num: line.oldLineNumber, text: line.text, type: 'removed' },
            right: { num: lines[lIdx + 1].newLineNumber, text: lines[lIdx + 1].text, type: 'added' },
          });
          lIdx += 2;
        } else {
          rows.push({
            left: { num: line.oldLineNumber, text: line.text, type: 'removed' },
            right: undefined,
          });
          lIdx++;
        }
      } else if (line.type === 'added') {
        rows.push({
          left: undefined,
          right: { num: line.newLineNumber, text: line.text, type: 'added' },
        });
        lIdx++;
      }
    }
    return rows;
  }, [lines]);

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Control Bar */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Base:</span>
            <select
              className="form-select"
              value={oldVersionId}
              onChange={(e) => setOldVersionId(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === newVersionId}>
                  v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()}) - {v.changeSummary || 'Revision'}
                </option>
              ))}
            </select>
          </div>

          <span style={{ color: '#94a3b8', fontWeight: 700 }}>➔</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Compare:</span>
            <select
              className="form-select"
              value={newVersionId}
              onChange={(e) => setNewVersionId(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {sortedVersions.map((v) => (
                <option key={v.id} value={v.id} disabled={v.id === oldVersionId}>
                  v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()}) {v.id === currentVersionId ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats & View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px' }}>
              +{stats.additions} lines
            </span>
            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px' }}>
              -{stats.deletions} lines
            </span>
          </div>

          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setDiffMode('split')}
              style={{
                background: diffMode === 'split' ? '#2563eb' : '#ffffff',
                color: diffMode === 'split' ? 'white' : '#64748b',
                border: 'none',
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Split View
            </button>
            <button
              onClick={() => setDiffMode('unified')}
              style={{
                background: diffMode === 'unified' ? '#2563eb' : '#ffffff',
                color: diffMode === 'unified' ? 'white' : '#64748b',
                border: 'none',
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Unified View
            </button>
          </div>
        </div>
      </div>

      {/* Diff Table View */}
      {diffMode === 'split' ? (
        <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem' }}>
                <th style={{ width: '50%', padding: '0.4rem 0.75rem', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>
                  v{oldVersion.versionNumber} (Base Version)
                </th>
                <th style={{ width: '50%', padding: '0.4rem 0.75rem', textAlign: 'left' }}>
                  v{newVersion.versionNumber} (Compare Version)
                </th>
              </tr>
            </thead>
            <tbody>
              {splitRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                  {/* Left (Old) Cell */}
                  <td
                    style={{
                      width: '50%',
                      padding: '0.2rem 0.5rem',
                      verticalAlign: 'top',
                      background: row.left?.type === 'removed' ? '#fef2f2' : row.left ? '#ffffff' : '#f8fafc',
                      color: row.left?.type === 'removed' ? '#991b1b' : '#334155',
                      borderRight: '1px solid #e2e8f0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.left && (
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <span style={{ width: '32px', color: '#94a3b8', userSelect: 'none', textAlign: 'right', flexShrink: 0 }}>
                          {row.left.num}
                        </span>
                        <span style={{ width: '12px', userSelect: 'none', color: '#dc2626', fontWeight: 700 }}>
                          {row.left.type === 'removed' ? '-' : ''}
                        </span>
                        <span style={{ flex: 1 }}>{row.left.text}</span>
                      </div>
                    )}
                  </td>

                  {/* Right (New) Cell */}
                  <td
                    style={{
                      width: '50%',
                      padding: '0.2rem 0.5rem',
                      verticalAlign: 'top',
                      background: row.right?.type === 'added' ? '#f0fdf4' : row.right ? '#ffffff' : '#f8fafc',
                      color: row.right?.type === 'added' ? '#166534' : '#334155',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.right && (
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <span style={{ width: '32px', color: '#94a3b8', userSelect: 'none', textAlign: 'right', flexShrink: 0 }}>
                          {row.right.num}
                        </span>
                        <span style={{ width: '12px', userSelect: 'none', color: '#16a34a', fontWeight: 700 }}>
                          {row.right.type === 'added' ? '+' : ''}
                        </span>
                        <span style={{ flex: 1 }}>{row.right.text}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Unified View */
        <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            <tbody>
              {lines.map((line, idx) => {
                const isAdded = line.type === 'added';
                const isRemoved = line.type === 'removed';
                const bg = isAdded ? '#f0fdf4' : isRemoved ? '#fef2f2' : '#ffffff';
                const textColor = isAdded ? '#166534' : isRemoved ? '#991b1b' : '#334155';
                const prefix = isAdded ? '+' : isRemoved ? '-' : ' ';

                return (
                  <tr key={idx} style={{ background: bg, borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ width: '40px', padding: '0.2rem 0.4rem', color: '#94a3b8', userSelect: 'none', textAlign: 'right', fontSize: '0.75rem' }}>
                      {line.oldLineNumber || ''}
                    </td>
                    <td style={{ width: '40px', padding: '0.2rem 0.4rem', color: '#94a3b8', userSelect: 'none', textAlign: 'right', fontSize: '0.75rem' }}>
                      {line.newLineNumber || ''}
                    </td>
                    <td style={{ width: '20px', padding: '0.2rem 0.2rem', textAlign: 'center', userSelect: 'none', fontWeight: 700, color: isAdded ? '#16a34a' : isRemoved ? '#dc2626' : 'transparent' }}>
                      {prefix}
                    </td>
                    <td style={{ padding: '0.2rem 0.5rem', color: textColor, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {line.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
