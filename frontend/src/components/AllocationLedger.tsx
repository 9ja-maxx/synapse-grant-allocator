import React from 'react';
import { CommentRecord } from '../types';

interface AllocationLedgerProps {
  winners: CommentRecord[];
  slotCount: number;
}

export const AllocationLedger: React.FC<AllocationLedgerProps> = ({ winners, slotCount }) => {
  return (
    <div className="panel" role="region" aria-label="Allocation Ledger">
      <div className="panel-header">
        <h2 className="panel-title">
          Hearing Slot Allocation Ledger ({winners.length}/{slotCount} slots)
        </h2>
      </div>

      {winners.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          Slot allocation has not been computed yet. Trigger slot allocation in the CLUSTERED state.
        </p>
      ) : (
        <div className="table-container">
          <table className="civic-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Selected Comment ID</th>
                <th>Cluster</th>
                <th>Score</th>
                <th>Selection Rule</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.external_id}>
                  <td className="font-mono" style={{ fontWeight: 600 }}>
                    #{w.selection_rank}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.external_id}</div>
                    <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-xs)' }}>
                      Evidence URL ↗
                    </a>
                  </td>
                  <td>
                    <span className="badge">
                      C{w.cluster_id}: {w.cluster_label || `Cluster ${w.cluster_id}`}
                    </span>
                  </td>
                  <td className="font-mono">{w.relevance_score}/100</td>
                  <td>
                    <span className="badge badge-success">{w.reason_code}</span>
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{w.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
