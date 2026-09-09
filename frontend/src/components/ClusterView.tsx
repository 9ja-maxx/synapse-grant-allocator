import React from 'react';
import { ClusterRecord } from '../types';

interface ClusterViewProps {
  clusters: ClusterRecord[];
}

export const ClusterView: React.FC<ClusterViewProps> = ({ clusters }) => {
  return (
    <div className="panel" role="region" aria-label="Consensus Clusters">
      <div className="panel-header">
        <h2 className="panel-title">Thematic Clusters ({clusters.length}/6)</h2>
      </div>

      {clusters.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          Clusters have not been derived yet. Run consensus clustering after batch lock.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {clusters.map((cl) => (
            <div
              key={cl.cluster_id}
              style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-paper)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  Cluster {cl.cluster_id}: {cl.label}
                </span>
                <span className="badge">
                  {cl.comment_ids.length} comment{cl.comment_ids.length === 1 ? '' : 's'}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)', marginTop: 'var(--space-1)' }}>
                {cl.summary}
              </p>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--color-ink-2)' }}>Members: </span>
                {cl.comment_ids.length > 0 ? (
                  <span className="font-mono">{cl.comment_ids.join(', ')}</span>
                ) : (
                  <span style={{ color: 'var(--color-ink-2)' }}>None</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
