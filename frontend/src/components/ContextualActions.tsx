import React, { useState } from 'react';
import {
  HearingSummary,
  CommentRecord,
  HexAddress,
  ChallengeType,
} from '../types';
import {
  isValidExternalId,
  isValidUrl,
  isValidSha256,
  computeTextDigest,
} from '../manifest';
import {
  isRegistrationOpen,
  isChallengeOpen,
  isFinalizeEligible,
  formatCountdown,
} from '../time';

interface ContextualActionsProps {
  hearing: HearingSummary | null;
  comments: CommentRecord[];
  account: HexAddress | null;
  isWriting: boolean;
  isWrongChain?: boolean;
  nowSec?: number;
  onRegisterComment: (params: {
    hearing_id: number;
    external_id: string;
    url: string;
    digest: string;
  }) => Promise<void>;
  onLockBatch: (hearingId: number) => Promise<void>;
  onCancelHearing: (hearingId: number) => Promise<void>;
  onClusterComments: (hearingId: number) => Promise<void>;
  onAllocateSlots: (hearingId: number) => Promise<void>;
  onOpenChallenge: (params: {
    hearing_id: number;
    challenge_type: ChallengeType;
    target_ids: string[];
  }) => Promise<void>;
  onFinalizeHearing: (hearingId: number) => Promise<void>;
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  hearing,
  comments,
  account,
  isWriting,
  isWrongChain = false,
  nowSec = Math.floor(Date.now() / 1000),
  onRegisterComment,
  onLockBatch,
  onCancelHearing,
  onClusterComments,
  onAllocateSlots,
  onOpenChallenge,
  onFinalizeHearing,
}) => {
  // Register Comment Form State
  const [extId, setExtId] = useState('');
  const [commentUrl, setCommentUrl] = useState('');
  const [commentDigest, setCommentDigest] = useState('');
  const [rawText, setRawText] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Open Challenge Form State
  const [challengeType, setChallengeType] = useState<ChallengeType>('PROVENANCE_INVALID');
  const [targetId1, setTargetId1] = useState('');
  const [targetId2, setTargetId2] = useState('');
  const [challengeError, setChallengeError] = useState<string | null>(null);

  if (!hearing) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Contextual Actions</h2>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          Select or create a hearing docket to perform actions.
        </p>
      </div>
    );
  }

  const isOrganizer = account && account.toLowerCase() === hearing.organizer.toLowerCase();
  const regOpen = isRegistrationOpen(nowSec, hearing.registration_deadline);
  const chalOpen = isChallengeOpen(nowSec, hearing.challenge_deadline);
  const finalizeEligible = isFinalizeEligible(
    nowSec,
    hearing.state,
    hearing.challenge_deadline,
    hearing.pending_challenge_count,
  );

  const regRemaining = hearing.registration_deadline - nowSec;
  const chRemaining = hearing.challenge_deadline - nowSec;

  const canWrite = Boolean(account && !isWrongChain && !isWriting);

  const handleComputeDigest = async () => {
    if (!rawText) return;
    const d = await computeTextDigest(rawText);
    setCommentDigest(d);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!isValidExternalId(extId)) {
      setRegisterError('External ID must be 1-128 chars without pipe delimiters or control characters.');
      return;
    }
    if (!isValidUrl(commentUrl)) {
      setRegisterError('Comment URL must start with http:// or https:// without spaces or delimiters.');
      return;
    }
    if (!isValidSha256(commentDigest)) {
      setRegisterError('Comment digest must be exactly 64 hexadecimal characters.');
      return;
    }

    try {
      await onRegisterComment({
        hearing_id: hearing.hearing_id,
        external_id: extId,
        url: commentUrl,
        digest: commentDigest,
      });
      setExtId('');
      setCommentUrl('');
      setCommentDigest('');
      setRawText('');
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChallengeError(null);

    const targets: string[] = [];
    if (challengeType === 'PROVENANCE_INVALID') {
      if (!targetId1) {
        setChallengeError('Please select a target comment for provenance challenge.');
        return;
      }
      targets.push(targetId1);
    } else {
      if (!targetId1 || !targetId2) {
        setChallengeError('Please select two distinct comments for duplicate pair challenge.');
        return;
      }
      if (targetId1 === targetId2) {
        setChallengeError('Duplicate pair targets must be two distinct comments.');
        return;
      }
      targets.push(targetId1, targetId2);
    }

    try {
      await onOpenChallenge({
        hearing_id: hearing.hearing_id,
        challenge_type: challengeType,
        target_ids: targets,
      });
      setTargetId1('');
      setTargetId2('');
    } catch (err: unknown) {
      setChallengeError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="panel" role="region" aria-label="Contextual Actions">
      <div className="panel-header">
        <h2 className="panel-title">Contextual Actions</h2>
        <span className="badge badge-accent">Stage: {hearing.state}</span>
      </div>

      {!account && (
        <div className="alert alert-pending">
          Connect an authorized wallet to submit on-chain transactions.
        </div>
      )}

      {account && isWrongChain && (
        <div className="alert alert-danger">
          Wallet connected to unsupported chain. Switch to GenLayer Studionet to submit transactions.
        </div>
      )}

      {/* COLLECTING State Actions */}
      {hearing.state === 'COLLECTING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                1. Register Public Comment
              </h3>
              <span className={`badge ${regOpen ? 'badge-success' : 'badge-danger'}`}>
                {regOpen ? `Closes in ${formatCountdown(regRemaining)}` : 'Registration Closed'}
              </span>
            </div>

            {!regOpen ? (
              <div className="alert alert-danger">
                Registration deadline has passed. New comment registrations are rejected by policy.
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {registerError && <div className="alert alert-danger">{registerError}</div>}
                <div className="alert alert-pending">
                  Registration is restricted to the authenticated admission authority: {hearing.admission_authority}.
                  The organizer must admit each public record before the manifest can be locked.
                </div>
                {!isOrganizer && (
                  <div className="alert alert-danger">
                    Connect the organizer wallet to admit records. Other wallets cannot register comments for this hearing.
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-ext-id">External Comment ID (1-128 chars):</label>
                  <input
                    id="reg-ext-id"
                    className="form-input"
                    value={extId}
                    onChange={(e) => setExtId(e.target.value)}
                    placeholder="e.g. DOC-2026-001-A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-url">Public Evidence URL (HTTP/HTTPS):</label>
                  <input
                    id="reg-url"
                    className="form-input"
                    type="url"
                    value={commentUrl}
                    onChange={(e) => setCommentUrl(e.target.value)}
                    placeholder="https://example.gov/comments/001.txt"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-digest">SHA-256 Digest (64 hex characters):</label>
                  <input
                    id="reg-digest"
                    className="form-input font-mono"
                    value={commentDigest}
                    onChange={(e) => setCommentDigest(e.target.value)}
                    placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    required
                  />
                </div>

                <div style={{ padding: 'var(--space-2)', backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-control)' }}>
                  <label className="form-label" htmlFor="raw-comment-text" style={{ display: 'block', marginBottom: '4px' }}>
                    Quick Digest Helper (compute from comment UTF-8 text):
                  </label>
                  <textarea
                    id="raw-comment-text"
                    className="form-textarea"
                    rows={2}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste canonical comment text here..."
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleComputeDigest}
                    disabled={!rawText}
                    style={{ marginTop: 'var(--space-1)', minHeight: '28px', fontSize: 'var(--text-xs)' }}
                  >
                    Compute SHA-256 Digest
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!canWrite || !isOrganizer || comments.length >= 12}
                >
                  {isWriting ? 'Submitting...' : 'Register Comment'}
                </button>
              </form>
            )}
          </div>

          <hr style={{ borderColor: 'var(--color-rule)' }} />

          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              2. Lock Batch (Organizer Only)
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-2)' }}>
              Verifies the computed manifest digest matches the committed expected digest, locking comments against alteration.
            </p>
            {!isOrganizer && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                Your connected address is not the docket organizer. Only {hearing.organizer.slice(0, 6)}... may lock the batch.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onLockBatch(hearing.hearing_id)}
              disabled={!canWrite || !isOrganizer || comments.length < hearing.slot_count}
              style={{ width: '100%' }}
            >
              {isWriting ? 'Locking Batch...' : 'Lock Comment Batch'}
            </button>
            {isOrganizer && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onCancelHearing(hearing.hearing_id)}
                disabled={!canWrite}
                style={{ width: '100%', marginTop: 'var(--space-2)' }}
              >
                {isWriting ? 'Cancelling...' : 'Cancel and Recreate Hearing'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOCKED State Actions */}
      {hearing.state === 'LOCKED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            The comment batch is locked. Trigger LLM consensus clustering to fetch public evidence, verify SHA-256 digests, and derive thematic clusters.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onClusterComments(hearing.hearing_id)}
            disabled={!canWrite}
            style={{ width: '100%' }}
          >
            {isWriting ? 'Clustering via Consensus...' : 'Cluster Comments (Permissionless)'}
          </button>
        </div>
      )}

      {/* CLUSTERED State Actions */}
      {hearing.state === 'CLUSTERED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            Comments have been clustered by consensus. Execute the deterministic coverage-first allocation policy to assign hearing slots.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAllocateSlots(hearing.hearing_id)}
            disabled={!canWrite}
            style={{ width: '100%' }}
          >
            {isWriting ? 'Allocating Slots...' : 'Allocate Slots (Permissionless)'}
          </button>
        </div>
      )}

      {/* CHALLENGE State Actions */}
      {hearing.state === 'CHALLENGE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                1. Open Dispute Challenge
              </h3>
              <span className={`badge ${chalOpen ? 'badge-success' : 'badge-danger'}`}>
                {chalOpen ? `Closes in ${formatCountdown(chRemaining)}` : 'Challenge Window Closed'}
              </span>
            </div>

            {!chalOpen ? (
              <div className="alert alert-danger">
                Challenge window is closed (passed deadline). New challenges are rejected.
              </div>
            ) : (
              <form onSubmit={handleOpenChallengeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {challengeError && <div className="alert alert-danger">{challengeError}</div>}
                <div className="form-group">
                  <label className="form-label" htmlFor="ch-type">Challenge Type:</label>
                  <select
                    id="ch-type"
                    className="form-select"
                    value={challengeType}
                    onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
                  >
                    <option value="PROVENANCE_INVALID">PROVENANCE_INVALID (1 comment)</option>
                    <option value="DUPLICATE_PAIR">DUPLICATE_PAIR (2 comments)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ch-target-1">Target Comment 1:</label>
                  <select
                    id="ch-target-1"
                    className="form-select"
                    value={targetId1}
                    onChange={(e) => setTargetId1(e.target.value)}
                    required
                  >
                    <option value="">-- Select Comment --</option>
                    {comments.map((c) => (
                      <option key={c.external_id} value={c.external_id}>
                        {c.external_id} (Cluster {c.cluster_id})
                      </option>
                    ))}
                  </select>
                </div>

                {challengeType === 'DUPLICATE_PAIR' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ch-target-2">Target Comment 2 (Distinct):</label>
                    <select
                      id="ch-target-2"
                      className="form-select"
                      value={targetId2}
                      onChange={(e) => setTargetId2(e.target.value)}
                      required
                    >
                      <option value="">-- Select Distinct Comment --</option>
                      {comments
                        .filter((c) => c.external_id !== targetId1)
                        .map((c) => (
                          <option key={c.external_id} value={c.external_id}>
                            {c.external_id} (Cluster {c.cluster_id})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!canWrite}
                >
                  {isWriting ? 'Opening Challenge...' : 'Open Challenge'}
                </button>
              </form>
            )}
          </div>

          <hr style={{ borderColor: 'var(--color-rule)' }} />

          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              2. Finalize Hearing Docket
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-2)' }}>
              Finalization locks the hearing permanently. Allowed only after challenge deadline has passed with no pending challenges.
            </p>
            {hearing.pending_challenge_count > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                Cannot finalize: {hearing.pending_challenge_count} challenge(s) pending resolution.
              </p>
            )}
            {chalOpen && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                Challenge window is still active ({formatCountdown(chRemaining)} remaining). Finalization permitted after challenge deadline.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onFinalizeHearing(hearing.hearing_id)}
              disabled={!canWrite || !finalizeEligible}
              style={{ width: '100%' }}
            >
              {isWriting ? 'Finalizing...' : 'Finalize Hearing (Immutable)'}
            </button>
          </div>
        </div>
      )}

      {/* FINAL State */}
      {hearing.state === 'FINAL' && (
        <div className="alert alert-success">
          Hearing docket #{hearing.hearing_id} is permanently finalized. Allocation ledger and evidence are immutable.
        </div>
      )}
    </div>
  );
};
