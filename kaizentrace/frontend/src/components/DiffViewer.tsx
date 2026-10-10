import React from 'react';
import { FileCode, Plus, Minus } from 'lucide-react';
import { IChangedFile } from '../types.js';

interface DiffViewerProps {
  changedFiles: IChangedFile[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ changedFiles }) => {
  if (!changedFiles || changedFiles.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No code changes detected. Working tree matches recorded baseline.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {changedFiles.map((cf, idx) => {
        const lines = cf.patch ? cf.patch.split('\n') : [];

        return (
          <div key={idx} className="card" style={{ overflow: 'hidden' }}>
            {/* File Header */}
            <div
              style={{
                padding: '0.6rem 1rem',
                backgroundColor: 'var(--bg-card-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={16} color="var(--primary)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {cf.file}
                </span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {cf.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 600 }}>
                  <Plus size={12} /> {cf.insertions}
                </span>
                <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 600 }}>
                  <Minus size={12} /> {cf.deletions}
                </span>
              </div>
            </div>

            {/* Diff content */}
            <div className="diff-container" style={{ border: 'none', borderRadius: 0 }}>
              {lines.map((line, lIdx) => {
                let lineClass = 'diff-line';
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  lineClass += ' diff-line-add';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  lineClass += ' diff-line-del';
                } else if (line.startsWith('@@') || line.startsWith('diff --git') || line.startsWith('index')) {
                  lineClass += ' diff-line-header';
                }

                return (
                  <div key={lIdx} className={lineClass}>
                    <span style={{ userSelect: 'none', width: '2.5rem', opacity: 0.4, textAlign: 'right', marginRight: '0.75rem' }}>
                      {lIdx + 1}
                    </span>
                    <span>{line}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
