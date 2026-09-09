import React, { useState, useEffect, useRef } from 'react';
import {
  isValidUrl,
  isValidSha256,
  computeTextDigest,
} from '../manifest';

interface CreateHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWriting: boolean;
  onCreateHearing: (params: {
    proposal_url: string;
    proposal_digest: string;
    expected_manifest_digest: string;
    slot_count: number;
    registration_deadline: number;
    challenge_deadline: number;
  }) => Promise<void>;
}

export const CreateHearingModal: React.FC<CreateHearingModalProps> = ({
  isOpen,
  onClose,
  isWriting,
  onCreateHearing,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [proposalUrl, setProposalUrl] = useState('');
  const [proposalDigest, setProposalDigest] = useState('');
  const [expectedManifestDigest, setExpectedManifestDigest] = useState('');
  const [slotCount, setSlotCount] = useState<number>(3);
  const [regDeadlineMinutes, setRegDeadlineMinutes] = useState<number>(60);
  const [chDeadlineMinutes, setChDeadlineMinutes] = useState<number>(120);

  const [proposalText, setProposalText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleComputeProposalDigest = async () => {
    if (!proposalText) return;
    const d = await computeTextDigest(proposalText);
    setProposalDigest(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidUrl(proposalUrl)) {
      setError('Proposal URL must start with http:// or https:// without spaces or delimiters.');
      return;
    }
    if (!isValidSha256(proposalDigest)) {
      setError('Proposal digest must be exactly 64 hexadecimal characters.');
      return;
    }
    if (!isValidSha256(expectedManifestDigest)) {
      setError('Expected manifest digest must be exactly 64 hexadecimal characters.');
      return;
    }
    if (slotCount < 1 || slotCount > 6) {
      setError('Slot count must be between 1 and 6.');
      return;
    }
    if (regDeadlineMinutes <= 0) {
      setError('Registration deadline offset must be greater than 0.');
      return;
    }
    if (chDeadlineMinutes <= regDeadlineMinutes) {
      setError('Challenge deadline must be strictly later than registration deadline.');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const regDeadline = now + regDeadlineMinutes * 60;
    const chDeadline = now + chDeadlineMinutes * 60;

    try {
      await onCreateHearing({
        proposal_url: proposalUrl,
        proposal_digest: proposalDigest,
        expected_manifest_digest: expectedManifestDigest,
        slot_count: slotCount,
        registration_deadline: regDeadline,
        challenge_deadline: chDeadline,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-hearing-title"
        ref={dialogRef}
        tabIndex={-1}
        style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="panel-header">
          <h2 id="create-hearing-title" className="panel-title">
            Create Public Comment Hearing Docket
          </h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '0 var(--space-2)' }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="prop-url">Public Proposal Evidence URL:</label>
            <input
              id="prop-url"
              className="form-input"
              type="url"
              value={proposalUrl}
              onChange={(e) => setProposalUrl(e.target.value)}
              placeholder="https://example.gov/proposals/rule-2026.txt"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prop-digest">Proposal SHA-256 Digest (64 hex characters):</label>
            <input
              id="prop-digest"
              className="form-input font-mono"
              value={proposalDigest}
              onChange={(e) => setProposalDigest(e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              required
            />
          </div>

          <div style={{ padding: 'var(--space-2)', backgroundColor: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-control)' }}>
            <label className="form-label" htmlFor="raw-prop-text" style={{ display: 'block', marginBottom: '4px' }}>
              Compute Proposal Digest from Text:
            </label>
            <textarea
              id="raw-prop-text"
              className="form-textarea"
              rows={2}
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              placeholder="Paste raw canonical proposal text here..."
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleComputeProposalDigest}
              disabled={!proposalText}
              style={{ marginTop: 'var(--space-1)', minHeight: '28px', fontSize: 'var(--text-xs)' }}
            >
              Compute SHA-256
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="exp-manifest-digest">Expected Manifest SHA-256 Digest (Committed Batch Lock):</label>
            <input
              id="exp-manifest-digest"
              className="form-input font-mono"
              value={expectedManifestDigest}
              onChange={(e) => setExpectedManifestDigest(e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="slot-count">Available Hearing Slots (1 to 6):</label>
            <input
              id="slot-count"
              className="form-input font-mono"
              type="number"
              min={1}
              max={6}
              value={slotCount}
              onChange={(e) => setSlotCount(Number(e.target.value))}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-deadline">Registration Window (Minutes from now):</label>
              <input
                id="reg-deadline"
                className="form-input font-mono"
                type="number"
                min={1}
                value={regDeadlineMinutes}
                onChange={(e) => setRegDeadlineMinutes(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ch-deadline">Challenge Window (Minutes from now):</label>
              <input
                id="ch-deadline"
                className="form-input font-mono"
                type="number"
                min={regDeadlineMinutes + 1}
                value={chDeadlineMinutes}
                onChange={(e) => setChDeadlineMinutes(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isWriting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isWriting}
            >
              {isWriting ? 'Creating Hearing...' : 'Create Hearing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
