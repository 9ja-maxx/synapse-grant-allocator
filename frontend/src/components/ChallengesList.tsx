import React from 'react';
import { ChallengeRecord, LifecycleState } from '../types';

interface ChallengesListProps {
  challenges: ChallengeRecord[];
  currentState?: LifecycleState;
  onResolveChallenge: (challengeId: number) => void;
  isWriting: boolean;
}

export const ChallengesList: React.FC<ChallengesListProps> = ({
  challenges,
  currentState,
  onResolveChallenge,
  isWriting,
}) => {
  return (
    <div className="panel" role="region" aria-label="Dispute Challenges">
      <div className="panel-header">
        <h2 className="panel-title">Dispute Challenges ({challenges.length})</h2>
      </div>

      {challenges.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          No dispute challenges opened for this hearing.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {challenges.map((ch) => (
            <div
              key={ch.id}
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-control)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  Challenge #{ch.id}: {ch.challenge_type}
                </span>
                <span
                  className={`badge ${
                    ch.status === 'ACCEPTED'
                      ? 'badge-success'
                      : ch.status === 'REJECTED'
                      ? 'badge-danger'
                      : 'badge-pending'
                  }`}
                >
                  {ch.status}
                </span>
              </div>

              <dl className="meta-list">
                <dt>Target Comments</dt>
                <dd className="font-mono">{ch.target_ids.join(', ')}</dd>

                <dt>Challenger</dt>
                <dd className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {ch.challenger}
                </dd>

                {ch.resolution_reason && (
                  <>
                    <dt>Resolution</dt>
                    <dd style={{ fontSize: 'var(--text-xs)' }}>
                      {ch.resolution_reason} (Revision #{ch.resolved_at_revision})
                    </dd>
                  </>
                )}
              </dl>

              {ch.status === 'PENDING' && currentState === 'CHALLENGE' && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ minHeight: '32px', padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' }}
                    onClick={() => onResolveChallenge(ch.id)}
                    disabled={isWriting}
                    aria-label={`Resolve Challenge #${ch.id}`}
                  >
                    Resolve Challenge #{ch.id} (Consensus)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
