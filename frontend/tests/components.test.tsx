import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Masthead } from '../src/components/Masthead';
import { WalletChooserModal } from '../src/components/WalletChooserModal';
import { LifecycleRail } from '../src/components/LifecycleRail';
import { HearingSelector } from '../src/components/HearingSelector';
import { HearingDetails } from '../src/components/HearingDetails';
import { CommentsTable } from '../src/components/CommentsTable';
import { ManifestPreview } from '../src/components/ManifestPreview';
import { ClusterView } from '../src/components/ClusterView';
import { AllocationLedger } from '../src/components/AllocationLedger';
import { ChallengesList } from '../src/components/ChallengesList';
import { ContextualActions } from '../src/components/ContextualActions';
import { CreateHearingModal } from '../src/components/CreateHearingModal';
import { TransactionProgress } from '../src/components/TransactionProgress';
import { ErrorBanner } from '../src/components/ErrorBanner';
import { HearingSummary, CommentRecord, ClusterRecord, ChallengeRecord } from '../src/types';
import { DiscoveredWalletItem, ALLOWLISTED_WALLETS } from '../src/wallet';

const mockHearing: HearingSummary = {
  hearing_id: 1,
  organizer: '0x1234567890abcdef1234567890abcdef12345678',
  admission_authority: '0x1234567890abcdef1234567890abcdef12345678',
  proposal_url: 'https://example.gov/rules/p1.txt',
  proposal_digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  expected_manifest_digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  computed_manifest_digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  slot_count: 2,
  registration_deadline: 1800000000,
  challenge_deadline: 1800003600,
  state: 'COLLECTING',
  comment_count: 2,
  revision: 0,
  accepted_challenge_count: 0,
  pending_challenge_count: 0,
  total_challenge_count: 0,
};

const mockComments: CommentRecord[] = [
  {
    index: 0,
    external_id: 'DOC-1',
    url: 'https://example.gov/c1.txt',
    digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    registrar: '0x1234567890abcdef1234567890abcdef12345678',
    eligible: true,
    exclusion_reason: '',
    cluster_id: 1,
    cluster_label: 'Environmental Impact',
    relevance_score: 90,
    is_duplicate: false,
    duplicate_of_id: '',
    selected: true,
    selection_rank: 1,
    reason_code: 'UNIQUE_CLUSTER_COVERAGE',
    rationale: 'Primary representative comment',
  },
];

const mockClusters: ClusterRecord[] = [
  {
    cluster_id: 1,
    label: 'Environmental Impact',
    summary: 'Focuses on water and air safety',
    comment_ids: ['DOC-1'],
  },
];

const mockChallenges: ChallengeRecord[] = [
  {
    id: 1,
    challenge_type: 'PROVENANCE_INVALID',
    target_ids: ['DOC-1'],
    challenger: '0x9999999999999999999999999999999999999999',
    status: 'PENDING',
    resolution_reason: '',
    resolved_at_revision: 0,
  },
];

describe('Austere Civic Workbench Component Suites', () => {
  it('renders Masthead with Hallmark header stamp, network badge, and wallet connect button', () => {
    const onOpenWallet = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <Masthead
        account={null}
        activeWallet={null}
        isConnecting={false}
        isWrongChain={false}
        onOpenWalletChooser={onOpenWallet}
        onDisconnect={onDisconnect}
        isConfigured={true}
      />,
    );

    expect(screen.getByText(/Public Comment Hearing Allocator/i)).toBeInTheDocument();
    expect(screen.getByText(/Studionet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Connect Wallet/i }));
    expect(onOpenWallet).toHaveBeenCalledTimes(1);
  });

  it('renders Masthead showing Wrong Network warning when on wrong chain', () => {
    render(
      <Masthead
        account="0x1234567890abcdef1234567890abcdef12345678"
        activeWallet={ALLOWLISTED_WALLETS[0]}
        isConnecting={false}
        isWrongChain={true}
        onOpenWalletChooser={vi.fn()}
        onDisconnect={vi.fn()}
        isConfigured={true}
      />,
    );

    expect(screen.getByText(/Wrong Network/i)).toBeInTheDocument();
  });

  it('renders LifecycleRail with state milestone indicators', () => {
    render(<LifecycleRail currentState="COLLECTING" />);
    expect(screen.getByText('COLLECTING')).toBeInTheDocument();
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
    expect(screen.getByText('CLUSTERED')).toBeInTheDocument();
    expect(screen.getByText('ALLOCATED')).toBeInTheDocument();
    expect(screen.getByText('CHALLENGE')).toBeInTheDocument();
    expect(screen.getByText('FINAL')).toBeInTheDocument();
  });

  it('renders HearingSelector with create button and hearing list', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const onRefresh = vi.fn();

    render(
      <HearingSelector
        hearingCount={1}
        selectedHearingId={1}
        isLoading={false}
        isConfigured={true}
        onSelectHearing={onSelect}
        onRefresh={onRefresh}
        onOpenCreateModal={onCreate}
      />,
    );

    expect(screen.getByText(/Docket #1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create new public comment hearing/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Create new public comment hearing/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders HearingDetails with metrics and digests', () => {
    render(<HearingDetails hearing={mockHearing} nowSec={1700000000} />);
    expect(screen.getByText(/Hearing Docket #1/i)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example\.gov\/rules\/p1\.txt/i)).toBeInTheDocument();
    expect(screen.getByText(/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/i)).toBeInTheDocument();
  });

  it('renders CommentsTable', () => {
    render(<CommentsTable comments={mockComments} />);
    expect(screen.getByText('DOC-1')).toBeInTheDocument();
    expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
    expect(screen.getByText('UNIQUE_CLUSTER_COVERAGE')).toBeInTheDocument();
  });

  it('renders ManifestPreview', () => {
    render(<ManifestPreview comments={mockComments} hearing={mockHearing} />);
    expect(screen.getByText(/Canonical Comment Manifest/i)).toBeInTheDocument();
  });

  it('renders ClusterView', () => {
    render(<ClusterView clusters={mockClusters} />);
    expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
  });

  it('renders AllocationLedger', () => {
    render(<AllocationLedger winners={mockComments} slotCount={2} />);
    expect(screen.getByText(/Hearing Slot Allocation Ledger/i)).toBeInTheDocument();
    expect(screen.getByText('DOC-1')).toBeInTheDocument();
  });

  it('renders ChallengesList', () => {
    const onResolve = vi.fn();
    render(
      <ChallengesList
        challenges={mockChallenges}
        currentState="CHALLENGE"
        onResolveChallenge={onResolve}
        isWriting={false}
      />,
    );
    expect(screen.getByText(/Dispute Challenges/i)).toBeInTheDocument();
    expect(screen.getByText(/PROVENANCE_INVALID/i)).toBeInTheDocument();
  });

  it('renders ContextualActions in COLLECTING state and handles register submit', () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(
      <ContextualActions
        hearing={mockHearing}
        comments={mockComments}
        account="0x1234567890abcdef1234567890abcdef12345678"
        isWriting={false}
        nowSec={1700000000} // Before registration deadline 1800000000
        onRegisterComment={onRegister}
        onLockBatch={vi.fn()}
        onCancelHearing={vi.fn()}
        onClusterComments={vi.fn()}
        onAllocateSlots={vi.fn()}
        onOpenChallenge={vi.fn()}
        onFinalizeHearing={vi.fn()}
      />,
    );

    expect(screen.getByText(/1\. Register Public Comment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Comment/i })).toBeInTheDocument();
  });

  it('renders ContextualActions with disabled registration when deadline is passed', () => {
    render(
      <ContextualActions
        hearing={mockHearing}
        comments={mockComments}
        account="0x1234567890abcdef1234567890abcdef12345678"
        isWriting={false}
        nowSec={1850000000} // After deadline 1800000000
        onRegisterComment={vi.fn()}
        onLockBatch={vi.fn()}
        onCancelHearing={vi.fn()}
        onClusterComments={vi.fn()}
        onAllocateSlots={vi.fn()}
        onOpenChallenge={vi.fn()}
        onFinalizeHearing={vi.fn()}
      />,
    );

    expect(screen.getByText(/Registration deadline has passed/i)).toBeInTheDocument();
  });

  it('renders WalletChooserModal and displays discovered/supported providers', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const wallets: DiscoveredWalletItem[] = [
      {
        walletType: 'metamask',
        metadata: ALLOWLISTED_WALLETS[0],
        detail: {
          info: { uuid: '1', name: 'MetaMask', icon: 'data:image/svg+xml,provider-logo', rdns: 'io.metamask' },
          provider: { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
        },
        isAvailable: true,
      },
    ];

    render(
      <WalletChooserModal
        isOpen={true}
        wallets={wallets}
        onSelectWallet={onSelect}
        onClose={onClose}
        isConnecting={false}
        error={null}
      />,
    );

    expect(screen.getByText(/Connect Supported Wallet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect MetaMask/i })).toBeInTheDocument();
    expect(screen.getByAltText('MetaMask logo')).toHaveAttribute('src', 'data:image/svg+xml,provider-logo');
    expect(screen.queryByText(/Supports MetaMask, OKX Wallet, and Rabby only/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders CreateHearingModal with form fields', () => {
    const onClose = vi.fn();
    const onCreate = vi.fn();

    render(
      <CreateHearingModal
        isOpen={true}
        onClose={onClose}
        isWriting={false}
        onCreateHearing={onCreate}
      />,
    );

    expect(screen.getByText(/Create Public Comment Hearing Docket/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Hearing/i })).toBeInTheDocument();
  });

  it('renders TransactionProgress lifecycle state tracker', () => {
    const onDismiss = vi.fn();
    render(
      <TransactionProgress
        actionLabel="Register Comment"
        phase="submitted"
        hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        error={undefined}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText(/Register Comment/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Transaction submitted to Studionet/i)).toBeInTheDocument();
  });

  it('renders ErrorBanner with dismiss trigger', () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner error="Network connection failed" onDismiss={onDismiss} />);
    expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dismiss error/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
