import React, { useState } from 'react';
import { CommentRecord } from '../types';

interface CommentsTableProps {
  comments: CommentRecord[];
}

type FilterType = 'all' | 'selected' | 'unselected' | 'duplicates' | 'excluded';

export const CommentsTable: React.FC<CommentsTableProps> = ({ comments }) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredComments = comments.filter((c) => {
    if (filter === 'selected') return c.selected;
    if (filter === 'unselected') return !c.selected;
    if (filter === 'duplicates') return c.is_duplicate;
    if (filter === 'excluded') return !c.eligible;
    return true;
  });

  return (
    <div className="panel" role="region" aria-label="Registered Comments">
      <div className="panel-header">
        <h2 className="panel-title">Registered Comments ({comments.length}/12)</h2>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {(['all', 'selected', 'unselected', 'duplicates', 'excluded'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn ${filter === tab ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '28px', padding: '0 var(--space-2)', fontSize: 'var(--text-xs)' }}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {comments.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          No comments registered for this hearing yet.
        </p>
      ) : (
        <div className="table-container">
          <table className="civic-table">
            <thead>
              <tr>
                <th>#</th>
                <th>External ID</th>
                <th>Cluster</th>
                <th>Score</th>
                <th>Status</th>
                <th>Reason / Rationale</th>
                <th>Digest</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.map((c) => (
                <tr key={c.external_id}>
                  <td className="font-mono">{c.index}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.external_id}</div>
                    <div>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-xs)' }}>
                        Source URL ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    {c.cluster_id > 0 ? (
                      <span className="badge">
                        C{c.cluster_id}: {c.cluster_label || `Cluster ${c.cluster_id}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)' }}>
                        {c.eligible ? 'Unclustered' : 'Irrelevant (C0)'}
                      </span>
                    )}
                  </td>
                  <td className="font-mono">
                    {c.relevance_score > 0 ? `${c.relevance_score}/100` : '—'}
                  </td>
                  <td>
                    {c.selected && (
                      <span className="badge badge-success">Rank #{c.selection_rank} Winner</span>
                    )}
                    {!c.selected && c.is_duplicate && (
                      <span className="badge badge-pending">Duplicate of {c.duplicate_of_id}</span>
                    )}
                    {!c.selected && !c.eligible && !c.is_duplicate && (
                      <span className="badge badge-danger">Excluded</span>
                    )}
                    {!c.selected && c.eligible && !c.is_duplicate && (
                      <span className="badge">Unselected</span>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>
                    {c.reason_code ? (
                      <div>
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {c.reason_code}
                        </span>
                        {c.rationale && <p style={{ marginTop: '2px' }}>{c.rationale}</p>}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-ink-2)' }}>Pending allocation</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ fontSize: '10px' }} title={c.digest}>
                    {c.digest.slice(0, 10)}...{c.digest.slice(-6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
