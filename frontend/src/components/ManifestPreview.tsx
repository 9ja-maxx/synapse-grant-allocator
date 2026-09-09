import React, { useEffect, useState } from 'react';
import { CommentRecord, HearingSummary } from '../types';
import { buildManifestString, computeManifestDigest } from '../manifest';

interface ManifestPreviewProps {
  comments: CommentRecord[];
  hearing: HearingSummary | null;
}

export const ManifestPreview: React.FC<ManifestPreviewProps> = ({ comments, hearing }) => {
  const [computedDigest, setComputedDigest] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const manifestString = buildManifestString(comments);

  useEffect(() => {
    let isCancelled = false;
    computeManifestDigest(comments).then((digest) => {
      if (!isCancelled) {
        setComputedDigest(digest);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [comments]);

  const isMatch = hearing && computedDigest === hearing.expected_manifest_digest.toLowerCase();

  return (
    <div className="panel" role="region" aria-label="Canonical Manifest Preview">
      <div className="panel-header">
        <h2 className="panel-title">Canonical Comment Manifest</h2>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ minHeight: '28px', padding: '0 var(--space-2)', fontSize: 'var(--text-xs)' }}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide Raw Manifest' : 'View Raw Manifest'}
        </button>
      </div>

      <dl className="meta-list">
        <dt>Live Manifest Digest</dt>
        <dd className="font-mono" style={{ fontSize: 'var(--text-xs)' }}>
          {computedDigest || 'Computing...'}
        </dd>

        <dt>Lock Match Status</dt>
        <dd>
          {hearing ? (
            isMatch ? (
              <span className="badge badge-success">✓ Matches Expected Lock Digest</span>
            ) : (
              <span className="badge badge-danger">✗ Digest Mismatch with Expected</span>
            )
          ) : (
            <span style={{ color: 'var(--color-ink-2)' }}>No hearing loaded</span>
          )}
        </dd>
      </dl>

      {isExpanded && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <label className="form-label">Canonical UTF-8 Format (&lt;index&gt;|&lt;id&gt;|&lt;url&gt;|&lt;digest&gt;\n):</label>
          <pre
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-paper)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-control)',
              fontSize: 'var(--text-xs)',
              overflowX: 'auto',
              maxHeight: '200px',
              whiteSpace: 'pre',
            }}
          >
            {manifestString || '(No comments registered in batch)'}
          </pre>
        </div>
      )}
    </div>
  );
};
