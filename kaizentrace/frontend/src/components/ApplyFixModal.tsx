import React from 'react';
import { IRecommendedFix } from '../types.js';
import { Wrench, X, ShieldCheck } from 'lucide-react';

interface ApplyFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recommendedFix: IRecommendedFix;
  loading: boolean;
}

export const ApplyFixModal: React.FC<ApplyFixModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recommendedFix,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '680px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '0.85rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.4rem', backgroundColor: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={18} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Review and Apply Fix
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target: {recommendedFix.targetFile}
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Explanation */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {recommendedFix.title}
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {recommendedFix.reasoning}
            </p>
          </div>

          {/* Unified Diff */}
          {recommendedFix.unifiedDiff && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Proposed Source Code Patch:
              </div>
              <div className="diff-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {recommendedFix.unifiedDiff.split('\n').map((line, idx) => {
                  let cls = 'diff-line';
                  if (line.startsWith('+') && !line.startsWith('+++')) cls += ' diff-line-add';
                  else if (line.startsWith('-') && !line.startsWith('---')) cls += ' diff-line-del';
                  else if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) cls += ' diff-line-header';

                  return (
                    <div key={idx} className={cls}>
                      <span>{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: '0.5rem',
              display: 'flex',
              gap: '0.65rem',
              fontSize: '0.8125rem',
              color: 'var(--success-text)',
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <strong>Safety Assurances:</strong>
              <div style={{ marginTop: '0.2rem', opacity: 0.9 }}>
                KaizenTrace creates an in-memory backup prior to modification, modifies only the verified line, and retains a reversible patch record in MongoDB Atlas.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Applying Patch...' : 'Confirm & Apply Patch'}
          </button>
        </div>
      </div>
    </div>
  );
};
