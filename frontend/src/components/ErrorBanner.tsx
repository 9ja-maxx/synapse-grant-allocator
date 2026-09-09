import React from 'react';

interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div
      className="alert alert-danger"
      role="alert"
      style={{
        margin: 'var(--space-4) var(--space-6) 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <strong>Error: </strong>
        <span>{error}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onDismiss}
          style={{ minHeight: '24px', padding: '0 var(--space-2)', fontSize: 'var(--text-xs)' }}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
};
