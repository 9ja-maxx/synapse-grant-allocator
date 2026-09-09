import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { APP_CONFIG } from './config';
import {
  HearingSummary,
  CommentRecord,
  ClusterRecord,
  ChallengeRecord,
  WriteLifecycleState,
  ChallengeType,
} from './types';
import {
  EIP6963DiscoveryService,
  WalletSessionController,
  DiscoveredWalletItem,
  WalletSessionState,
} from './wallet';
import { GenLayerContractClient, HearingCreatedReconciliationError } from './client';
import { useTickingTimestamp } from './time';
import { Masthead } from './components/Masthead';
import { WalletChooserModal } from './components/WalletChooserModal';
import { LifecycleRail } from './components/LifecycleRail';
import { HearingSelector } from './components/HearingSelector';
import { HearingDetails } from './components/HearingDetails';
import { CommentsTable } from './components/CommentsTable';
import { ManifestPreview } from './components/ManifestPreview';
import { ClusterView } from './components/ClusterView';
import { AllocationLedger } from './components/AllocationLedger';
import { ChallengesList } from './components/ChallengesList';
import { ContextualActions } from './components/ContextualActions';
import { CreateHearingModal } from './components/CreateHearingModal';
import { TransactionProgress } from './components/TransactionProgress';
import { ErrorBanner } from './components/ErrorBanner';

export const App: React.FC = () => {
  // Live ticking Unix timestamp (seconds)
  const nowSec = useTickingTimestamp(1000);

  // Discovery Service & Wallets
  const discoveryService = useMemo(() => new EIP6963DiscoveryService(), []);
  const [discoveredWallets, setDiscoveredWallets] = useState<DiscoveredWalletItem[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement | null>(null);

  // Hardened In-Memory Wallet Session Controller (Zero Persistence)
  const sessionController = useMemo(() => new WalletSessionController(), []);
  const [walletSession, setWalletSession] = useState<WalletSessionState>(sessionController.getState());

  // Contract Client Instance
  const client = useMemo(
    () =>
      new GenLayerContractClient(
        (APP_CONFIG.contractAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
      ),
    [],
  );

  // Application Data State
  const [hearingCount, setHearingCount] = useState<number>(0);
  const [selectedHearingId, setSelectedHearingId] = useState<number | null>(null);
  const [hearing, setHearing] = useState<HearingSummary | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [clusters, setClusters] = useState<ClusterRecord[]>([]);
  const [winners, setWinners] = useState<CommentRecord[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);

  // UI / Async State
  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(APP_CONFIG.validationError || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Write Transaction State Machine
  const [txState, setTxState] = useState<WriteLifecycleState>({
    phase: 'idle',
  });

  // Start EIP-6963 Discovery on mount
  useEffect(() => {
    discoveryService.start();
    const unsubscribeDiscovery = discoveryService.subscribe((wallets) => {
      setDiscoveredWallets(wallets);
    });
    const unsubscribeSession = sessionController.subscribe((state) => {
      setWalletSession(state);
    });

    return () => {
      unsubscribeDiscovery();
      unsubscribeSession();
      discoveryService.stop();
      sessionController.destroy();
    };
  }, [discoveryService, sessionController]);

  // Load Hearing Data from Contract
  const loadHearingData = useCallback(
    async (hearingId: number) => {
      if (!APP_CONFIG.isConfigured) return;
      setIsLoading(true);
      setAppError(null);
      try {
        const [h, allComments, allClusters, allWinners, allChallenges] = await Promise.all([
          client.getHearing(hearingId),
          client.getAllComments(hearingId),
          client.getClusters(hearingId),
          client.getAllocationLedger(hearingId),
          client.getAllChallenges(hearingId),
        ]);
        setHearing(h);
        setComments(allComments);
        setClusters(allClusters);
        setWinners(allWinners);
        setChallenges(allChallenges);
      } catch (err: unknown) {
        setAppError(`Failed to load hearing #${hearingId}: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  // Refresh hearing list & active hearing
  const refreshAll = useCallback(async () => {
    if (!APP_CONFIG.isConfigured) return;
    setIsLoading(true);
    try {
      const count = await client.getHearingCount();
      setHearingCount(count);
      if (count > 0) {
        const targetId = selectedHearingId && selectedHearingId <= count ? selectedHearingId : count;
        setSelectedHearingId(targetId);
        await loadHearingData(targetId);
      } else {
        setSelectedHearingId(null);
        setHearing(null);
        setComments([]);
        setClusters([]);
        setWinners([]);
        setChallenges([]);
      }
    } catch (err: unknown) {
      setAppError(`RPC fetch error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [client, loadHearingData, selectedHearingId]);

  // Initial Load on Mount
  useEffect(() => {
    if (APP_CONFIG.isConfigured) {
      refreshAll();
    }
  }, [refreshAll]);

  // Handle Hearing Selection Change
  const handleSelectHearing = (id: number) => {
    setSelectedHearingId(id);
    loadHearingData(id);
  };

  // Wallet Connect Handler
  const handleSelectWallet = async (walletItem: DiscoveredWalletItem) => {
    await sessionController.connect(walletItem);
    const updated = sessionController.getState();
    if (updated.account && !updated.error) {
      setIsWalletModalOpen(false);
    }
  };

  // Wallet Disconnect Handler (Clears in-memory state)
  const handleDisconnect = () => {
    sessionController.disconnect();
  };

  // Helper to ensure wallet is ready for write
  const getWriteOptions = (actionLabel: string) => {
    if (!walletSession.selectedDetail || !walletSession.account) {
      throw new Error('Wallet not connected. Please connect an authorized wallet.');
    }
    if (walletSession.isWrongChain) {
      throw new Error('Wallet is connected to the wrong network. Please switch to Studionet.');
    }
    return {
      account: walletSession.account,
      provider: walletSession.selectedDetail.provider,
      onPhaseChange: (phase: WriteLifecycleState['phase'], hash?: `0x${string}`, error?: string) => {
        setTxState({ phase, hash, error, actionLabel });
      },
    };
  };

  const reconcileHearing = async (
    hearingId: number,
    txHash: `0x${string}`,
    actionLabel: string,
  ) => {
    setTxState({ phase: 'reading_contract', hash: txHash, actionLabel });
    try {
      await loadHearingData(hearingId);
      setTxState({ phase: 'completed', hash: txHash, actionLabel });
    } catch (err: unknown) {
      const message = `Transaction executed successfully, but authoritative readback failed: ${err instanceof Error ? err.message : String(err)}. Refresh to reconcile; do not resubmit.`;
      setTxState({
        phase: 'reconciliation_required',
        hash: txHash,
        error: message,
        actionLabel,
        requiresReconciliation: true,
      });
      throw new Error(message);
    }
  };

  // Write Action Handlers
  const handleCreateHearing = async (params: {
    proposal_url: string;
    proposal_digest: string;
    expected_manifest_digest: string;
    slot_count: number;
    registration_deadline: number;
    challenge_deadline: number;
  }) => {
    const opts = getWriteOptions('Create Hearing');
    setTxState({ phase: 'preparing', actionLabel: 'Create Hearing' });

    try {
      const result = await client.createHearing(
        params.proposal_url,
        params.proposal_digest,
        params.expected_manifest_digest,
        params.slot_count,
        params.registration_deadline,
        params.challenge_deadline,
        opts,
      );

      setHearingCount((prev) => Math.max(prev, result.hearingId));
      setSelectedHearingId(result.hearingId);
      await reconcileHearing(result.hearingId, result.txHash, 'Create Hearing');
    } catch (err: unknown) {
      if (err instanceof HearingCreatedReconciliationError) {
        // Safe fail-closed handling: transaction succeeded, inform user to refresh
        setTxState({
          phase: 'reconciliation_required',
          hash: err.txHash,
          actionLabel: 'Create Hearing (Needs Refresh)',
          requiresReconciliation: true,
        });
        await refreshAll();
        return;
      }
      setAppError(`Create Hearing failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleRegisterComment = async (params: {
    hearing_id: number;
    external_id: string;
    url: string;
    digest: string;
  }) => {
    const opts = getWriteOptions('Register Comment');
    setTxState({ phase: 'preparing', actionLabel: 'Register Comment' });
    try {
      const result = await client.registerComment(
        params.hearing_id,
        params.external_id,
        params.url,
        params.digest,
        opts,
      );
      await reconcileHearing(params.hearing_id, result.txHash, 'Register Comment');
    } catch (err: unknown) {
      setAppError(`Register Comment failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleLockBatch = async (hearingId: number) => {
    const opts = getWriteOptions('Lock Batch');
    setTxState({ phase: 'preparing', actionLabel: 'Lock Batch' });
    try {
      const result = await client.lockBatch(hearingId, opts);
      await reconcileHearing(hearingId, result.txHash, 'Lock Batch');
    } catch (err: unknown) {
      setAppError(`Lock Batch failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleCancelHearing = async (hearingId: number) => {
    const opts = getWriteOptions('Cancel Hearing');
    setTxState({ phase: 'preparing', actionLabel: 'Cancel Hearing' });
    try {
      const result = await client.cancelHearing(hearingId, opts);
      await reconcileHearing(hearingId, result.txHash, 'Cancel Hearing');
    } catch (err: unknown) {
      setAppError(`Cancel Hearing failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleClusterComments = async (hearingId: number) => {
    const opts = getWriteOptions('Cluster Comments');
    setTxState({ phase: 'preparing', actionLabel: 'Cluster Comments' });
    try {
      const result = await client.clusterComments(hearingId, opts);
      await reconcileHearing(hearingId, result.txHash, 'Cluster Comments');
    } catch (err: unknown) {
      setAppError(`Cluster Comments failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleAllocateSlots = async (hearingId: number) => {
    const opts = getWriteOptions('Allocate Slots');
    setTxState({ phase: 'preparing', actionLabel: 'Allocate Slots' });
    try {
      const result = await client.allocateSlots(hearingId, opts);
      await reconcileHearing(hearingId, result.txHash, 'Allocate Slots');
    } catch (err: unknown) {
      setAppError(`Allocate Slots failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleOpenChallenge = async (params: {
    hearing_id: number;
    challenge_type: ChallengeType;
    target_ids: string[];
  }) => {
    const opts = getWriteOptions('Open Challenge');
    setTxState({ phase: 'preparing', actionLabel: 'Open Challenge' });
    try {
      const result = await client.openChallenge(
        params.hearing_id,
        params.challenge_type,
        params.target_ids,
        opts,
      );
      await reconcileHearing(params.hearing_id, result.txHash, 'Open Challenge');
    } catch (err: unknown) {
      setAppError(`Open Challenge failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleResolveChallenge = async (challengeId: number) => {
    if (!selectedHearingId) {
      setAppError('No hearing selected.');
      return;
    }
    const opts = getWriteOptions(`Resolve Challenge #${challengeId}`);
    setTxState({ phase: 'preparing', actionLabel: `Resolve Challenge #${challengeId}` });
    try {
      const result = await client.resolveChallenge(selectedHearingId, challengeId, opts);
      await reconcileHearing(selectedHearingId, result.txHash, `Resolve Challenge #${challengeId}`);
    } catch (err: unknown) {
      setAppError(`Resolve Challenge failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFinalizeHearing = async (hearingId: number) => {
    const opts = getWriteOptions('Finalize Hearing');
    setTxState({ phase: 'preparing', actionLabel: 'Finalize Hearing' });
    try {
      const result = await client.finalizeHearing(hearingId, opts);
      await reconcileHearing(hearingId, result.txHash, 'Finalize Hearing');
    } catch (err: unknown) {
      setAppError(`Finalize Hearing failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const isWriting = !['idle', 'completed', 'failed', 'reconciliation_required'].includes(txState.phase);

  return (
    <div className="workbench-shell">
      <Masthead
        account={walletSession.account}
        activeWallet={walletSession.selectedMetadata}
        isConnecting={walletSession.isConnecting}
        isWrongChain={walletSession.isWrongChain}
        onOpenWalletChooser={() => setIsWalletModalOpen(true)}
        onDisconnect={handleDisconnect}
        isConfigured={APP_CONFIG.isConfigured}
      />

      <LifecycleRail currentState={hearing?.state} />

      <HearingSelector
        hearingCount={hearingCount}
        selectedHearingId={selectedHearingId}
        onSelectHearing={handleSelectHearing}
        onRefresh={refreshAll}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        isLoading={isLoading}
        isConfigured={APP_CONFIG.isConfigured}
      />

      <ErrorBanner error={appError} onDismiss={() => setAppError(null)} />

      {walletSession.error && (
        <ErrorBanner error={walletSession.error} />
      )}

      {txState.phase !== 'idle' && (
        <div style={{ padding: '0 var(--space-6)', marginTop: 'var(--space-4)' }}>
          <TransactionProgress
            phase={txState.phase}
            hash={txState.hash}
            error={txState.error}
            actionLabel={txState.actionLabel}
            onDismiss={() => setTxState({ phase: 'idle' })}
          />
        </div>
      )}

      <main className="workbench-main" role="main">
        {/* Left Column: Hearing Evidence & Registered Comments */}
        <div className="workbench-column">
          <HearingDetails hearing={hearing} nowSec={nowSec} />
          <CommentsTable comments={comments} />
          <ManifestPreview comments={comments} hearing={hearing} />
          <ClusterView clusters={clusters} />
        </div>

        {/* Right Column: Contextual Action Forms & Allocation Ledger */}
        <div className="workbench-column">
          <ContextualActions
            hearing={hearing}
            comments={comments}
            account={walletSession.account}
            isWriting={isWriting}
            isWrongChain={walletSession.isWrongChain}
            nowSec={nowSec}
            onRegisterComment={handleRegisterComment}
            onLockBatch={handleLockBatch}
            onCancelHearing={handleCancelHearing}
            onClusterComments={handleClusterComments}
            onAllocateSlots={handleAllocateSlots}
            onOpenChallenge={handleOpenChallenge}
            onFinalizeHearing={handleFinalizeHearing}
          />
          <AllocationLedger winners={winners} slotCount={hearing?.slot_count || 0} />
          <ChallengesList
            challenges={challenges}
            currentState={hearing?.state}
            onResolveChallenge={handleResolveChallenge}
            isWriting={isWriting}
          />
        </div>
      </main>

      <footer className="workbench-footer" role="contentinfo">
        <div className="footer-provenance">
          <span>Studionet · </span>
          <span>Contract: </span>
          <span className="font-mono">
            {APP_CONFIG.contractAddress || 'Deployment Pending'}
          </span>
          {APP_CONFIG.contractAddress && APP_CONFIG.explorerUrl && (
            <span>
              {' '}·{' '}
              <a
                href={`${APP_CONFIG.explorerUrl}/address/${APP_CONFIG.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explorer ↗
              </a>
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          Public Comment Hearing Allocator · Non-economic transparent slot allocation
        </div>
      </footer>

      <WalletChooserModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallets={discoveredWallets}
        onSelectWallet={handleSelectWallet}
        isConnecting={walletSession.isConnecting}
        error={walletSession.error}
        triggerRef={connectButtonRef}
      />

      <CreateHearingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        isWriting={isWriting}
        onCreateHearing={handleCreateHearing}
      />
    </div>
  );
};
