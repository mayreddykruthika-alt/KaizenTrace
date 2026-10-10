import React from 'react';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';
import { StepState } from '../types.js';

interface WorkflowStepProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  state: StepState;
  isLast?: boolean;
  children?: React.ReactNode;
}

export const WorkflowStep: React.FC<WorkflowStepProps> = ({
  stepNumber,
  title,
  subtitle,
  state,
  isLast = false,
  children,
}) => {
  const getStepIcon = () => {
    switch (state) {
      case 'completed':
        return <Check size={16} strokeWidth={2.5} color="#ffffff" />;
      case 'failed':
        return <AlertTriangle size={16} strokeWidth={2.5} color="#ffffff" />;
      case 'running':
        return <Loader2 size={16} className="animate-spin" color="#ffffff" />;
      case 'pending':
      default:
        return <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stepNumber}</span>;
    }
  };

  const getCircleBg = () => {
    switch (state) {
      case 'completed':
        return 'var(--success)';
      case 'failed':
        return 'var(--danger)';
      case 'running':
        return 'var(--primary)';
      case 'pending':
      default:
        return 'var(--bg-card-subtle)';
    }
  };

  const getBadgeClass = () => {
    switch (state) {
      case 'completed':
        return 'badge-success';
      case 'failed':
        return 'badge-danger';
      case 'running':
        return 'badge-info animate-pulse-subtle';
      case 'pending':
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.25rem', position: 'relative' }}>
      {/* Left indicator & connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '9999px',
            backgroundColor: getCircleBg(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: state === 'pending' ? '1px solid var(--border-strong)' : 'none',
            zIndex: 2,
            boxShadow: state !== 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {getStepIcon()}
        </div>

        {!isLast && (
          <div
            style={{
              width: '2px',
              flexGrow: 1,
              backgroundColor: state === 'completed' ? 'var(--success-border)' : 'var(--border-subtle)',
              margin: '0.25rem 0',
              zIndex: 1,
            }}
          />
        )}
      </div>

      {/* Step Content */}
      <div style={{ flexGrow: 1, paddingBottom: isLast ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>

          <span className={`badge ${getBadgeClass()}`} style={{ textTransform: 'capitalize' }}>
            {state}
          </span>
        </div>

        {/* Child details rendered if present */}
        {children && (
          <div style={{ marginTop: '0.85rem' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
