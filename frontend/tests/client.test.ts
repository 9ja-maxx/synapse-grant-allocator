import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GenLayerContractClient,
  HearingCreatedReconciliationError,
} from '../src/client';
import { TransactionStatus } from 'genlayer-js/types';
import { EIP1193Provider } from '../src/wallet';

// Mock genlayer-js createClient
const mockReadContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockGetTransaction = vi.fn();
const mockConnect = vi.fn();

vi.mock('genlayer-js', () => ({
  createClient: () => ({
    readContract: mockReadContract,
    writeContract: mockWriteContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    getTransaction: mockGetTransaction,
    connect: mockConnect,
  }),
}));

describe('GenLayerContractClient (9 Writes & 12 Views)', () => {
  const contractAddress = '0x1234567890abcdef1234567890abcdef12345678' as const;
  const userAccount = '0x9999999999999999999999999999999999999999' as const;
  const validTxHash = '0x1111111111111111111111111111111111111111111111111111111111111111' as const;

  let client: GenLayerContractClient;
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GenLayerContractClient(contractAddress);
    mockProvider = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    };
  });

  describe('12 View Methods', () => {
    it('1. getHearingCount', async () => {
      mockReadContract.mockResolvedValue(5);
      const count = await client.getHearingCount();
      expect(count).toBe(5);
    });

    it('2. getHearing', async () => {
      mockReadContract.mockResolvedValue({
        hearing_id: 1,
        organizer: '0x1234567890abcdef1234567890abcdef12345678',
        admission_authority: '0x1234567890abcdef1234567890abcdef12345678',
        proposal_url: 'https://example.gov/p1.txt',
        proposal_digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        expected_manifest_digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        computed_manifest_digest: '',
        slot_count: 3,
        registration_deadline: 1800000000,
        challenge_deadline: 1800003600,
        state: 'COLLECTING',
        comment_count: 0,
        revision: 0,
        accepted_challenge_count: 0,
        pending_challenge_count: 0,
        total_challenge_count: 0,
      });

      const hearing = await client.getHearing(1);
      expect(hearing.hearing_id).toBe(1);
      expect(hearing.state).toBe('COLLECTING');
    });

    it('3. getCommentCount', async () => {
      mockReadContract.mockResolvedValue(4);
      const count = await client.getCommentCount(1);
      expect(count).toBe(4);
    });

    it('4. getCommentByIndex', async () => {
      mockReadContract.mockResolvedValue({
        index: 0,
        external_id: 'DOC-1',
        url: 'https://example.gov/c1.txt',
        digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        registrar: userAccount,
        eligible: true,
        exclusion_reason: '',
        cluster_id: 1,
        cluster_label: 'Impact',
        relevance_score: 80,
        is_duplicate: false,
        duplicate_of_id: '',
        selected: true,
        selection_rank: 1,
        reason_code: 'UNIQUE_CLUSTER_COVERAGE',
        rationale: 'Top score',
      });

      const comment = await client.getCommentByIndex(1, 0);
      expect(comment.external_id).toBe('DOC-1');
      expect(comment.selected).toBe(true);
    });

    it('5. getCommentById', async () => {
      mockReadContract.mockResolvedValue({
        index: 1,
        external_id: 'DOC-2',
        url: 'https://example.gov/c2.txt',
        digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        registrar: userAccount,
        eligible: true,
        exclusion_reason: '',
        cluster_id: 2,
        cluster_label: 'Cost',
        relevance_score: 70,
        is_duplicate: false,
        duplicate_of_id: '',
        selected: false,
        selection_rank: 0,
        reason_code: '',
        rationale: '',
      });

      const comment = await client.getCommentById(1, 'DOC-2');
      expect(comment.external_id).toBe('DOC-2');
      expect(comment.index).toBe(1);
    });

    it('6. getAllComments', async () => {
      mockReadContract.mockResolvedValue([
        {
          index: 0,
          external_id: 'DOC-1',
          url: 'https://example.gov/c1.txt',
          digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          registrar: userAccount,
          eligible: true,
          exclusion_reason: '',
          cluster_id: 1,
          cluster_label: '',
          relevance_score: 0,
          is_duplicate: false,
          duplicate_of_id: '',
          selected: false,
          selection_rank: 0,
          reason_code: '',
          rationale: '',
        },
      ]);

      const comments = await client.getAllComments(1);
      expect(comments.length).toBe(1);
      expect(comments[0].external_id).toBe('DOC-1');
    });

    it('7. getClusters', async () => {
      mockReadContract.mockResolvedValue([
        {
          cluster_id: 1,
          label: 'Health Policy',
          summary: 'Health safety comments',
          comment_ids: ['DOC-1'],
        },
      ]);

      const clusters = await client.getClusters(1);
      expect(clusters.length).toBe(1);
      expect(clusters[0].label).toBe('Health Policy');
    });

    it('8. getAllocationLedger', async () => {
      mockReadContract.mockResolvedValue([
        {
          index: 0,
          external_id: 'DOC-1',
          url: 'https://example.gov/c1.txt',
          digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          registrar: userAccount,
          eligible: true,
          exclusion_reason: '',
          cluster_id: 1,
          cluster_label: 'Health Policy',
          relevance_score: 95,
          is_duplicate: false,
          duplicate_of_id: '',
          selected: true,
          selection_rank: 1,
          reason_code: 'UNIQUE_CLUSTER_COVERAGE',
          rationale: 'Primary representative',
        },
      ]);

      const ledger = await client.getAllocationLedger(1);
      expect(ledger.length).toBe(1);
      expect(ledger[0].selected).toBe(true);
      expect(ledger[0].selection_rank).toBe(1);
    });

    it('9. getChallenge', async () => {
      mockReadContract.mockResolvedValue({
        id: 1,
        challenge_type: 'PROVENANCE_INVALID',
        target_ids: ['DOC-1'],
        challenger: userAccount,
        status: 'PENDING',
        resolution_reason: '',
        resolved_at_revision: 0,
      });

      const challenge = await client.getChallenge(1, 1);
      expect(challenge.id).toBe(1);
      expect(challenge.status).toBe('PENDING');
    });

    it('10. getAllChallenges', async () => {
      mockReadContract.mockResolvedValue([
        {
          id: 1,
          challenge_type: 'DUPLICATE_PAIR',
          target_ids: ['DOC-1', 'DOC-2'],
          challenger: userAccount,
          status: 'ACCEPTED',
          resolution_reason: 'High semantic similarity',
          resolved_at_revision: 1,
        },
      ]);

      const challenges = await client.getAllChallenges(1);
      expect(challenges.length).toBe(1);
      expect(challenges[0].status).toBe('ACCEPTED');
    });

    it('11. getState', async () => {
      mockReadContract.mockResolvedValue('LOCKED');
      const state = await client.getState(1);
      expect(state).toBe('LOCKED');
    });

    it('12. getManifest', async () => {
      mockReadContract.mockResolvedValue('0|DOC-1|https://example.gov/c1.txt|digest\n');
      const manifest = await client.getManifest(1);
      expect(manifest).toContain('0|DOC-1');
    });
  });

  describe('8 Write Methods & Fail-Closed Receipt Execution Lifecycle', () => {
    const successReceipt = {
      hash: validTxHash,
      status: TransactionStatus.FINALIZED,
      result: 'SUCCESS',
      execution_result: 'FINISHED_WITH_RETURN',
      consensus_data: {
        leader_receipt: {
          execution_result: 'FINISHED_WITH_RETURN',
          result: 1,
        },
      },
    };

    it('1. createHearing: extracts returned hearing ID without inferring global count', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        ...successReceipt,
        consensus_data: {
          leader_receipt: {
            execution_result: 'FINISHED_WITH_RETURN',
            result: 7, // Returned hearing ID is 7
          },
        },
      });

      const phases: string[] = [];
      const res = await client.createHearing(
        'https://example.gov/p1.txt',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        3,
        1800000000,
        1800003600,
        {
          account: userAccount,
          provider: mockProvider,
          onPhaseChange: (p) => phases.push(p),
        },
      );

      expect(res.hearingId).toBe(7);
      expect(res.txHash).toBe(validTxHash);
      expect(phases).toContain('preparing');
      expect(phases).toContain('wallet_confirmation');
      expect(phases).toContain('submitted');
      expect(phases).toContain('consensus');
      expect(phases).toContain('finalized');
      expect(phases).toContain('execution_verified');
      expect(phases).not.toContain('reading_contract');
      expect(phases).not.toContain('completed');
    });

    it('1b. createHearing: throws HearingCreatedReconciliationError if return ID is missing', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        hash: validTxHash,
        status: TransactionStatus.FINALIZED,
        result: 'SUCCESS',
        execution_result: 'FINISHED_WITH_RETURN',
        // No leader_receipt result
      });

      await expect(
        client.createHearing(
          'https://example.gov/p1.txt',
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          3,
          1800000000,
          1800003600,
          {
            account: userAccount,
            provider: mockProvider,
          },
        ),
      ).rejects.toThrow(HearingCreatedReconciliationError);
    });

    it('2. registerComment', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        ...successReceipt,
        consensus_data: {
          leader_receipt: {
            execution_result: 'FINISHED_WITH_RETURN',
            result: 0,
          },
        },
      });

      const res = await client.registerComment(
        1,
        'DOC-1',
        'https://example.gov/c1.txt',
        'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        { account: userAccount, provider: mockProvider },
      );

      expect(res.commentIndex).toBe(0);
      expect(res.txHash).toBe(validTxHash);
    });

    it('3. lockBatch', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        ...successReceipt,
        consensus_data: {
          leader_receipt: {
            execution_result: 'FINISHED_WITH_RETURN',
            result: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          },
        },
      });

      const res = await client.lockBatch(1, { account: userAccount, provider: mockProvider });
      expect(res.computedManifestDigest).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
    });

    it('4. clusterComments', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue(successReceipt);

      const res = await client.clusterComments(1, { account: userAccount, provider: mockProvider });
      expect(res.txHash).toBe(validTxHash);
    });

    it('4b. cancelHearing', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue(successReceipt);

      const res = await client.cancelHearing(1, { account: userAccount, provider: mockProvider });
      expect(res.txHash).toBe(validTxHash);
    });

    it('5. allocateSlots', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue(successReceipt);

      const res = await client.allocateSlots(1, { account: userAccount, provider: mockProvider });
      expect(res.txHash).toBe(validTxHash);
    });

    it('6. openChallenge', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        ...successReceipt,
        consensus_data: {
          leader_receipt: {
            execution_result: 'FINISHED_WITH_RETURN',
            result: 1,
          },
        },
      });

      const res = await client.openChallenge(1, 'PROVENANCE_INVALID', ['DOC-1'], {
        account: userAccount,
        provider: mockProvider,
      });
      expect(res.challengeId).toBe(1);
    });

    it('7. resolveChallenge', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue(successReceipt);

      const res = await client.resolveChallenge(1, 1, { account: userAccount, provider: mockProvider });
      expect(res.txHash).toBe(validTxHash);
    });

    it('8. finalizeHearing', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue(successReceipt);

      const res = await client.finalizeHearing(1, { account: userAccount, provider: mockProvider });
      expect(res.txHash).toBe(validTxHash);
    });

    it('fails closed when contract execution reverts on-chain', async () => {
      mockWriteContract.mockResolvedValue(validTxHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        hash: validTxHash,
        status: TransactionStatus.FINALIZED,
        result: 'FAILURE',
        execution_result: 'FINISHED_WITH_ERROR',
        error: 'Only docket organizer may lock comment batch',
      });

      await expect(
        client.lockBatch(1, { account: userAccount, provider: mockProvider }),
      ).rejects.toThrow(/Only docket organizer may lock comment batch/);
    });
  });
});
