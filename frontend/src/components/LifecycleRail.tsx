import React from 'react';
import { LifecycleState, LIFECYCLE_STATES } from '../types';

interface LifecycleRailProps {
  currentState?: LifecycleState;
}

export const LifecycleRail: React.FC<LifecycleRailProps> = ({ currentState }) => {
  const getStepStatus = (state: LifecycleState): 'passed' | 'active' | 'pending' => {
    if (!currentState) return 'pending';

    const order: Record<LifecycleState, number> = {
      COLLECTING: 0,
      LOCKED: 1,
      CLUSTERED: 2,
      ALLOCATED: 3,
      CHALLENGE: 4,
      FINAL: 5,
      CANCELLED: 6,
    };

    const currentIdx = order[currentState];
    const stepIdx = order[state];

    // Special case for ALLOCATED milestone when contract is in CHALLENGE or FINAL
    if (state === 'ALLOCATED') {
      if (currentIdx >= order.CHALLENGE) return 'passed';
      return 'pending';
    }

    if (currentIdx === stepIdx) return 'active';
    if (currentIdx > stepIdx) return 'passed';
    return 'pending';
  };

  const getActionHint = (state?: LifecycleState): string => {
    switch (state) {
      case 'COLLECTING':
        return 'Permitted actions: Organizer-admitted records only · Lock or cancel before lock (organizer only).';
      case 'LOCKED':
        return 'Permitted action: Run consensus clustering (permissionless).';
      case 'CLUSTERED':
        return 'Permitted action: Allocate hearing slots (permissionless).';
      case 'CHALLENGE':
        return 'Permitted actions: Open / resolve dispute challenges · Finalize after deadline.';
      case 'FINAL':
        return 'Hearing is finalized and immutable. Allocations and challenges are locked.';
      case 'CANCELLED':
        return 'Admission batch cancelled before lock. Create a replacement hearing with a new manifest.';
      default:
        return 'No hearing selected.';
    }
  };

  return (
    <div className="lifecycle-rail-container" role="region" aria-label="Hearing Lifecycle State">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <ol className="lifecycle-rail">
          {LIFECYCLE_STATES.map((state, idx) => {
            const status = getStepStatus(state);
            return (
              <React.Fragment key={state}>
                <li
                  className={`lifecycle-step is-${status}`}
                  aria-current={status === 'active' ? 'step' : undefined}
                >
                  <span>{idx + 1}.</span>
                  <span>{state}</span>
                  {state === 'ALLOCATED' && (
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>(Milestone)</span>
                  )}
                </li>
                {idx < LIFECYCLE_STATES.length - 1 && (
                  <span className="lifecycle-arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </ol>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          {getActionHint(currentState)}
        </div>
      </div>
    </div>
  );
};
