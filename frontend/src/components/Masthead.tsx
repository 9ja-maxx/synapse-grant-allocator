import React from 'react';
import { HexAddress } from '../types';
import { WalletMetadata } from '../wallet';

interface MastheadProps {
  account: HexAddress | null;
  activeWallet: WalletMetadata | null;
  isConnecting: boolean;
  isWrongChain?: boolean;
  onOpenWalletChooser: () => void;
  onDisconnect: () => void;
  isConfigured: boolean;
}

export const Masthead: React.FC<MastheadProps> = ({
  account,
  activeWallet,
  isConnecting,
  isWrongChain = false,
  onOpenWalletChooser,
  onDisconnect,
  isConfigured,
}) => {
  return (
    <header className="masthead" role="banner">
      <div className="masthead-brand">
        <h1 className="masthead-title">Public Comment Hearing Allocator</h1>
        <span className="masthead-badge">Studionet</span>
        {!isConfigured && (
          <span className="badge badge-pending">Deployment Pending</span>
        )}
      </div>

      <div className="masthead-controls">
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {isWrongChain ? (
              <span className="badge badge-danger" title="Please switch to Studionet">
                Wrong Network
              </span>
            ) : (
              <span className="badge badge-accent" title={account}>
                {activeWallet ? `${activeWallet.name}: ` : ''}
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onDisconnect}
              aria-label="Disconnect wallet"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenWalletChooser}
            disabled={isConnecting}
            aria-label="Connect wallet"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
};

