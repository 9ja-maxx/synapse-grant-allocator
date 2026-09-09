import React from 'react';
import { HearingSummary } from '../types';
import { formatUtcDateTime, formatCountdown } from '../time';

interface HearingDetailsProps {
  hearing: HearingSummary | null;
  nowSec?: number;
}

export const HearingDetails: React.FC<HearingDetailsProps> = ({ hearing, nowSec = Math.floor(Date.now() / 1000) }) => {
  if (!hearing) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Hearing Docket</h2>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          Select or create a hearing docket to view evidence and allocation state.
        </p>
      </div>
    );
  }

  const regRemaining = hearing.registration_deadline - nowSec;
  const chRemaining = hearing.challenge_deadline - nowSec;

  return (
    <div className="panel" role="region" aria-label="Hearing Details">
      <div className="panel-header">
        <h2 className="panel-title">Hearing Docket #{hearing.hearing_id}</h2>
        <span className="badge badge-accent">{hearing.state}</span>
      </div>

      <dl className="meta-list">
        <dt>Organizer</dt>
        <dd className="font-mono">{hearing.organizer}</dd>

        <dt>Admission Authority</dt>
        <dd className="font-mono">{hearing.admission_authority}</dd>

        <dt>Proposal URL</dt>
        <dd>
          <a href={hearing.proposal_url} target="_blank" rel="noopener noreferrer">
            {hearing.proposal_url}
          </a>
        </dd>

        <dt>Proposal Digest</dt>
        <dd className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
          {hearing.proposal_digest}
        </dd>

        <dt>Expected Manifest</dt>
        <dd className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
          {hearing.expected_manifest_digest}
        </dd>

        <dt>Computed Manifest</dt>
        <dd className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
          {hearing.computed_manifest_digest || '(Not locked yet)'}
        </dd>

        <dt>Hearing Slots</dt>
        <dd>{hearing.slot_count} slots</dd>

        <dt>Registration Deadline</dt>
        <dd>
          <div>{formatUtcDateTime(hearing.registration_deadline)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: regRemaining > 0 ? 'var(--color-success)' : 'var(--color-ink-2)' }}>
            {formatCountdown(regRemaining)}
          </div>
        </dd>

        <dt>Challenge Deadline</dt>
        <dd>
          <div>{formatUtcDateTime(hearing.challenge_deadline)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: chRemaining > 0 ? 'var(--color-success)' : 'var(--color-ink-2)' }}>
            {formatCountdown(chRemaining)}
          </div>
        </dd>

        <dt>Batch & Revision</dt>
        <dd>
          {hearing.comment_count} comments · Revision #{hearing.revision}
        </dd>

        <dt>Challenges</dt>
        <dd>
          {hearing.total_challenge_count} total ({hearing.accepted_challenge_count} accepted, {hearing.pending_challenge_count} pending)
        </dd>
      </dl>
    </div>
  );
};
