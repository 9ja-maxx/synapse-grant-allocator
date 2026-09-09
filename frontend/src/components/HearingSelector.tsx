import React from 'react';

interface HearingSelectorProps {
  hearingCount: number;
  selectedHearingId: number | null;
  onSelectHearing: (id: number) => void;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  isLoading: boolean;
  isConfigured: boolean;
}

export const HearingSelector: React.FC<HearingSelectorProps> = ({
  hearingCount,
  selectedHearingId,
  onSelectHearing,
  onRefresh,
  onOpenCreateModal,
  isLoading,
  isConfigured,
}) => {
  const hearingIds = Array.from({ length: hearingCount }, (_, i) => i + 1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-6)',
        backgroundColor: 'var(--color-paper)',
        borderBottom: '1px solid var(--color-rule)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <label htmlFor="hearing-select" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Hearing:
        </label>
        {hearingCount > 0 ? (
          <select
            id="hearing-select"
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={selectedHearingId || ''}
            onChange={(e) => onSelectHearing(Number(e.target.value))}
            disabled={isLoading || !isConfigured}
          >
            {hearingIds.map((id) => (
              <option key={id} value={id}>
                Docket #{id}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
            {isConfigured ? 'No hearings created yet.' : 'Contract not deployed.'}
          </span>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={isLoading || !isConfigured}
          style={{ minHeight: '32px', padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' }}
          aria-label="Refresh contract data"
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateModal}
          disabled={!isConfigured}
          style={{ minHeight: '32px', padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' }}
          aria-label="Create new public comment hearing"
        >
          + Create Hearing
        </button>
      </div>
    </div>
  );
};
