import React from 'react';
import { TransactionPhase, TransactionHash } from '../types';

interface TransactionProgressProps {
  phase: TransactionPhase;
  hash?: TransactionHash;
  error?: string;
  actionLabel?: string;
  onDismiss?: () => void;
}

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  phase,
  hash,
  error,
  actionLabel,
  onDismiss,
}) => {
  if (phase === 'idle') return null;

  const steps: { key: TransactionPhase; label: string }[] = [
    { key: 'preparing', label: '1. Preparing call data' },
    { key: 'wallet_confirmation', label: '2. Awaiting wallet signature' },
    { key: 'submitted', label: '3. Transaction submitted to Studionet' },
    { key: 'consensus', label: '4. Validator consensus & execution' },
    { key: 'finalized', label: '5. Block finalized on-chain' },
    { key: 'execution_verified', label: '6. Execution result verified' },
    { key: 'reading_contract', label: '7. Reading updated contract state' },
    { key: 'reconciliation_required', label: 'Readback needs reconciliation' },
    { key: 'completed', label: '8. Transaction completed' },
  ];

  const getStepStatus = (stepKey: TransactionPhase): 'completed' | 'active' | 'pending' | 'failed' => {
    if (phase === 'failed') {
      return 'failed';
    }
    const order: TransactionPhase[] = [
      'idle',
      'preparing',
      'wallet_confirmation',
      'submitted',
      'consensus',
      'finalized',
      'execution_verified',
      'reading_contract',
      'reconciliation_required',
      'completed',
    ];
    const currentIdx = order.indexOf(phase);
    const stepIdx = order.indexOf(stepKey);

    if (currentIdx === stepIdx) return 'active';
    if (currentIdx > stepIdx) return 'completed';
    return 'pending';
  };

  return (
    <div
      className="panel"
      role="region"
      aria-label="Transaction Lifecycle Status"
      style={{
        borderLeft: phase === 'failed' || phase === 'reconciliation_required' ? '4px solid var(--color-danger)' : phase === 'completed' ? '4px solid var(--color-success)' : '4px solid var(--color-accent)',
      }}
    >
      <div className="panel-header">
        <h2 className="panel-title">
          Transaction Lifecycle {actionLabel ? `— ${actionLabel}` : ''}
        </h2>
        {onDismiss && (phase === 'completed' || phase === 'failed' || phase === 'reconciliation_required') && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDismiss}
            style={{ minHeight: '24px', padding: '0 var(--space-2)', fontSize: 'var(--text-xs)' }}
            aria-label="Dismiss transaction progress"
          >
            Dismiss
          </button>
        )}
      </div>

      {hash && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)' }}>
          <span>Transaction Hash: </span>
          <span className="font-mono" style={{ fontWeight: 600 }}>{hash}</span>
        </div>
      )}

      <div className="tx-stepper">
        {steps.map((step) => {
          const status = getStepStatus(step.key);
          return (
            <div key={step.key} className={`tx-step is-${status}`}>
              <span>
                {status === 'completed' ? '✓' : status === 'active' ? '●' : status === 'failed' ? '✗' : '○'}
              </span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      {phase === 'failed' && error && (
        <div className="alert alert-danger" role="alert">
          <strong>Transaction Failure:</strong> {error}
        </div>
      )}

      {phase === 'completed' && (
        <div className="alert alert-success" role="status">
          Transaction confirmed and verified against authoritative on-chain state readback.
        </div>
      )}
      {phase === 'reconciliation_required' && (
        <div className="alert alert-danger" role="alert">
          The transaction executed, but contract readback is not reconciled. Refresh before taking another action; do not resubmit.
        </div>
      )}
    </div>
  );
};
