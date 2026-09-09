import React, { useEffect, useRef } from 'react';
import { DiscoveredWalletItem } from '../wallet';

interface WalletChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: DiscoveredWalletItem[];
  onSelectWallet: (wallet: DiscoveredWalletItem) => void;
  isConnecting: boolean;
  error: string | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const WalletChooserModal: React.FC<WalletChooserModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onSelectWallet,
  isConnecting,
  error,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save currently focused element to restore on close
    previouslyFocusedElementRef.current =
      triggerRef?.current || (document.activeElement as HTMLElement | null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Basic focus trap within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the modal box or first focusable control
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-chooser-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="panel-header">
          <h2 id="wallet-chooser-title" className="panel-title">
            Connect Supported Wallet
          </h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '0 var(--space-2)' }}
            aria-label="Close wallet selection dialog"
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>
          Select an installed EIP-6963 provider. No session tokens, keys, or prior choices are persisted.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert" style={{ margin: 'var(--space-2) 0' }}>
            <strong>Connection Error: </strong>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          {wallets.filter((item) => item.isAvailable).map((item) => (
            <div
              key={`${item.walletType}-${item.detail?.info.uuid || 'missing'}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--color-paper-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {(item.detail?.info.icon || item.metadata.defaultIcon) ? (
                  <img
                    src={item.detail?.info.icon || item.metadata.defaultIcon}
                    alt={`${item.metadata.name} logo`}
                    width={28}
                    height={28}
                    style={{ borderRadius: 'var(--radius-control)' }}
                  />
                ) : null}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    {item.metadata.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)' }}>
                    {`Detected (${item.detail?.info.rdns})`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelectWallet(item)}
                disabled={isConnecting}
                aria-label={`Connect ${item.metadata.name}`}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
