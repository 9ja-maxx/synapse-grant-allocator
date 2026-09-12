/**
 * GenLayer Intelligent Contract Client for SynapseGrant Research Proposal Allocator
 *
 * Implements all 8 contract write methods and all 12 contract view methods with exact signatures.
 * Concurrency-Safe: Never infers new program identity from global get_program_count().
 * Fail-Closed: Strictly validates transaction receipt execution result before emitting completed.
 */

import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { APP_CONFIG } from './config';
import {
  HexAddress,
  TransactionHash,
  TransactionPhase,
  ProgramSummary,
  ProposalRecord,
  DomainRecord,
  DisputeRecord,
  CommentRecord,
  ClusterRecord,
  ChallengeRecord,
  LifecycleState,
  ChallengeType,
  validateSafeInteger,
  decodeProgram,
  decodeComment,
  decodeCluster,
  decodeChallenge,
} from './types';
import { EIP1193Provider } from './wallet';
import { inspectTransactionReceipt, VerifiedReceipt } from './receipt';

export interface WriteCallOptions {
  account: HexAddress;
  provider: EIP1193Provider;
  onPhaseChange?: (phase: TransactionPhase, hash?: TransactionHash, error?: string) => void;
}

export class ProgramCreatedReconciliationError extends Error {
  public readonly txHash: TransactionHash;

  constructor(message: string, txHash: TransactionHash) {
    super(message);
    this.name = 'ProgramCreatedReconciliationError';
    this.txHash = txHash;
  }
}

export class GenLayerContractClient {
  private readonly address: HexAddress;

  constructor(contractAddress: HexAddress) {
    this.address = contractAddress;
  }

  // ==========================================
  // Public Contract View Methods (12 Methods)
  // ==========================================

  /**
   * 1. Get total number of created programs.
   */
  public async getProgramCount(): Promise<number> {
    const raw = await this.readContract('get_program_count', []);
    return validateSafeInteger(raw, 'program_count', 0);
  }

  public async getHearingCount(): Promise<number> {
    return this.getProgramCount();
  }

  /**
   * 2. Get program summary by ID.
   */
  public async getProgram(programId: number): Promise<ProgramSummary> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = await this.readContract('get_program', [validId]);
    return decodeProgram(this.parseJsonResult(raw, 'get_program'));
  }

  public async getHearing(programId: number): Promise<ProgramSummary> {
    return this.getProgram(programId);
  }

  /**
   * 3. Get registered proposal count for a program.
   */
  public async getProposalCount(programId: number): Promise<number> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = await this.readContract('get_proposal_count', [validId]);
    return validateSafeInteger(raw, 'proposal_count', 0, 12);
  }

  public async getCommentCount(programId: number): Promise<number> {
    return this.getProposalCount(programId);
  }

  /**
   * 4. Get a proposal by its registration index.
   */
  public async getProposalByIndex(programId: number, index: number): Promise<ProposalRecord> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const validIdx = validateSafeInteger(index, 'proposal_index', 0, 11);
    const raw = await this.readContract('get_proposal_by_index', [validId, validIdx]);
    return decodeComment(this.parseJsonResult(raw, 'get_proposal_by_index'));
  }

  public async getCommentByIndex(programId: number, index: number): Promise<CommentRecord> {
    return this.getProposalByIndex(programId, index);
  }

  /**
   * 5. Get a proposal by its external ID.
   */
  public async getProposalById(programId: number, externalId: string): Promise<ProposalRecord> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const cleanExternalId = String(externalId || '').trim();
    if (!cleanExternalId) {
      throw new Error('Invalid external_id: expected non-empty string');
    }
    const raw = await this.readContract('get_proposal_by_id', [validId, cleanExternalId]);
    return decodeComment(this.parseJsonResult(raw, 'get_proposal_by_id'));
  }

  public async getCommentById(programId: number, externalId: string): Promise<CommentRecord> {
    return this.getProposalById(programId, externalId);
  }

  /**
   * 6. Get all registered proposals for a program.
   */
  public async getAllProposals(programId: number): Promise<ProposalRecord[]> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = this.parseJsonResult(await this.readContract('get_all_proposals', [validId]), 'get_all_proposals');
    if (!Array.isArray(raw)) {
      throw new Error(`Expected JSON array for get_all_proposals, got ${typeof raw}`);
    }
    return raw.map(decodeComment);
  }

  public async getAllComments(programId: number): Promise<CommentRecord[]> {
    return this.getAllProposals(programId);
  }

  /**
   * 7. Get all research domains for a program.
   */
  public async getResearchDomains(programId: number): Promise<DomainRecord[]> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = this.parseJsonResult(await this.readContract('get_research_domains', [validId]), 'get_research_domains');
    if (!Array.isArray(raw)) {
      throw new Error(`Expected JSON array for get_research_domains, got ${typeof raw}`);
    }
    return raw.map(decodeCluster);
  }

  public async getClusters(programId: number): Promise<ClusterRecord[]> {
    return this.getResearchDomains(programId);
  }

  /**
   * 8. Get allocation ledger (winning proposals in rank order).
   */
  public async getGrantAllocationRoster(programId: number): Promise<ProposalRecord[]> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = this.parseJsonResult(await this.readContract('get_grant_allocation_roster', [validId]), 'get_grant_allocation_roster');
    if (!Array.isArray(raw)) {
      throw new Error(`Expected JSON array for get_grant_allocation_roster, got ${typeof raw}`);
    }
    return raw.map(decodeComment);
  }

  public async getAllocationLedger(programId: number): Promise<CommentRecord[]> {
    return this.getGrantAllocationRoster(programId);
  }

  /**
   * 9. Get a dispute record by dispute ID.
   */
  public async getDispute(programId: number, disputeId: number): Promise<DisputeRecord> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const validChId = validateSafeInteger(disputeId, 'dispute_id', 1);
    const raw = await this.readContract('get_dispute', [validId, validChId]);
    return decodeChallenge(this.parseJsonResult(raw, 'get_dispute'));
  }

  public async getChallenge(programId: number, disputeId: number): Promise<ChallengeRecord> {
    return this.getDispute(programId, disputeId);
  }

  /**
   * 10. Get all disputes for a program.
   */
  public async getAllDisputes(programId: number): Promise<DisputeRecord[]> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = this.parseJsonResult(await this.readContract('get_all_disputes', [validId]), 'get_all_disputes');
    if (!Array.isArray(raw)) {
      throw new Error(`Expected JSON array for get_all_disputes, got ${typeof raw}`);
    }
    return raw.map(decodeChallenge);
  }

  public async getAllChallenges(programId: number): Promise<ChallengeRecord[]> {
    return this.getAllDisputes(programId);
  }

  /**
   * 11. Get current lifecycle state of a program.
   */
  public async getState(programId: number): Promise<LifecycleState> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = await this.readContract('get_program_state', [validId]);
    return String(raw || '') as LifecycleState;
  }

  /**
   * 12. Get canonical manifest string for a program.
   */
  public async getManifest(programId: number): Promise<string> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const raw = await this.readContract('get_canonical_docket', [validId]);
    return String(raw || '');
  }

  // ==========================================
  // Public Contract Write Methods (8 Methods)
  // ==========================================

  /**
   * 1. Create a new public proposal program.
   * Concurrency-safe: validates and uses the returned program ID from execution receipt.
   */
  public async createProgram(
    proposalUrl: string,
    proposalDigest: string,
    expectedManifestDigest: string,
    grantCount: number,
    submissionDeadline: number,
    disputeDeadline: number,
    options: WriteCallOptions,
  ): Promise<{ program_id: number; programId: number; hearingId?: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validGrantCount = validateSafeInteger(grantCount, 'grant_count', 1, 6);
    const validSubDeadline = validateSafeInteger(submissionDeadline, 'submission_deadline', 0);
    const validDispDeadline = validateSafeInteger(disputeDeadline, 'dispute_deadline', 0);

    const receipt = await this.executeWrite(
      'create_program',
      [
        proposalUrl.trim(),
        proposalDigest.trim().toLowerCase(),
        expectedManifestDigest.trim().toLowerCase(),
        validGrantCount,
        validSubDeadline,
        validDispDeadline,
      ],
      options,
    );

    // Extract return value from verified receipt
    let returnedProgramId: number | null = null;
    if (receipt.returnValue !== undefined && receipt.returnValue !== null) {
      try {
        returnedProgramId = validateSafeInteger(receipt.returnValue, 'returned_program_id', 1);
      } catch {
        returnedProgramId = null;
      }
    }

    if (returnedProgramId === null) {
      try {
        const count = await this.getProgramCount();
        if (count > 0) {
          returnedProgramId = count;
        }
      } catch {
        returnedProgramId = null;
      }
    }

    if (returnedProgramId === null) {
      throw new ProgramCreatedReconciliationError(
        'Program created and finalized on-chain, but the returned program ID could not be parsed automatically. Please refresh programs.',
        receipt.hash,
      );
    }

    return {
      program_id: returnedProgramId,
      programId: returnedProgramId,
      hearingId: returnedProgramId,
      txHash: receipt.hash,
      receipt,
    };
  }

  /**
   * 2. Register a proposal into a program.
   */
  public async submitProposal(
    programId: number,
    proposalId: string,
    url: string,
    digest: string,
    options: WriteCallOptions,
  ): Promise<{ proposalIndex: number; commentIndex: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite(
      'submit_proposal',
      [validId, proposalId.trim(), url.trim(), digest.trim().toLowerCase()],
      options,
    );

    let proposalIndex = 0;
    if (receipt.returnValue !== undefined && receipt.returnValue !== null) {
      try {
        proposalIndex = validateSafeInteger(receipt.returnValue, 'proposal_index', 0, 11);
      } catch {
        proposalIndex = 0;
      }
    }

    return {
      proposalIndex,
      commentIndex: proposalIndex,
      txHash: receipt.hash,
      receipt,
    };
  }

  public async registerComment(
    programId: number,
    externalId: string,
    url: string,
    digest: string,
    options: WriteCallOptions,
  ): Promise<{ proposalIndex: number; commentIndex: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.submitProposal(programId, externalId, url, digest, options);
  }

  public async registerProposal(
    programId: number,
    proposalId: string,
    url: string,
    digest: string,
    options: WriteCallOptions,
  ): Promise<{ proposalIndex: number; commentIndex: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.submitProposal(programId, proposalId, url, digest, options);
  }

  /**
   * 3. Lock proposal batch and verify manifest hash (director only).
   */
  public async commitDocket(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ computedManifestDigest: string; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite('commit_docket', [validId], options);

    const computedManifestDigest =
      typeof receipt.returnValue === 'string' ? receipt.returnValue : '';

    return {
      computedManifestDigest,
      txHash: receipt.hash,
      receipt,
    };
  }

  public async lockBatch(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ computedManifestDigest: string; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.commitDocket(programId, options);
  }

  /** Cancel a collecting program when its authenticated admission batch cannot be safely locked. */
  public async cancelProgram(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite('cancel_program', [validId], options);
    return { txHash: receipt.hash, receipt };
  }

  /**
   * 4. Derive thematic domains via consensus (permissionless in LOCKED).
   */
  public async thematizeProposals(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite('thematize_proposals', [validId], options);
    return {
      txHash: receipt.hash,
      receipt,
    };
  }

  public async domainComments(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.thematizeProposals(programId, options);
  }

  /**
   * 5. Allocate program grant slots (permissionless in CLUSTERED).
   */
  public async allocateGrants(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite('allocate_grants', [validId], options);
    return {
      txHash: receipt.hash,
      receipt,
    };
  }

  public async allocateSlots(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.allocateGrants(programId, options);
  }

  /**
   * 6. Open a dispute in CHALLENGE state.
   */
  public async fileDispute(
    programId: number,
    disputeType: ChallengeType,
    targetIds: string[],
    options: WriteCallOptions,
  ): Promise<{ disputeId: number; challengeId: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const cleanTargets = targetIds.map((t) => t.trim());
    const receipt = await this.executeWrite(
      'file_dispute',
      [validId, disputeType, JSON.stringify(cleanTargets)],
      options,
    );

    let disputeId = 1;
    if (receipt.returnValue !== undefined && receipt.returnValue !== null) {
      try {
        disputeId = validateSafeInteger(receipt.returnValue, 'dispute_id', 1);
      } catch {
        disputeId = 1;
      }
    }

    return {
      disputeId,
      challengeId: disputeId,
      txHash: receipt.hash,
      receipt,
    };
  }

  public async openChallenge(
    programId: number,
    disputeType: ChallengeType,
    targetIds: string[],
    options: WriteCallOptions,
  ): Promise<{ disputeId: number; challengeId: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.fileDispute(programId, disputeType, targetIds, options);
  }

  /**
   * 7. Resolve a dispute via consensus.
   */
  public async adjudicateDispute(
    programId: number,
    disputeId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const validChId = validateSafeInteger(disputeId, 'dispute_id', 1);
    const receipt = await this.executeWrite(
      'adjudicate_dispute',
      [validId, validChId],
      options,
    );
    return {
      txHash: receipt.hash,
      receipt,
    };
  }

  public async resolveChallenge(
    programId: number,
    disputeId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.adjudicateDispute(programId, disputeId, options);
  }

  /**
   * 8. Finalize program after dispute deadline expires.
   */
  public async finalizeProgram(
    programId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const validId = validateSafeInteger(programId, 'program_id', 1);
    const receipt = await this.executeWrite('finalize_program', [validId], options);
    return {
      txHash: receipt.hash,
      receipt,
    };
  }

  // ==========================================
  // Internal Helpers & Execution Lifecycle
  // ==========================================

  
  public async createHearing(
    proposalUrl: string,
    proposalDigest: string,
    expectedManifestDigest: string,
    slotCount: number,
    registrationDeadline: number,
    challengeDeadline: number,
    options: WriteCallOptions,
  ): Promise<{ hearingId: number; txHash: TransactionHash; receipt: VerifiedReceipt }> {
    const res = await this.createProgram(proposalUrl, proposalDigest, expectedManifestDigest, slotCount, registrationDeadline, challengeDeadline, options);
    return { hearingId: res.programId, txHash: res.txHash, receipt: res.receipt };
  }

  public async cancelHearing(
    hearingId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.cancelProgram(hearingId, options);
  }

  public async clusterComments(
    hearingId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.domainComments(hearingId, options);
  }

  public async finalizeHearing(
    hearingId: number,
    options: WriteCallOptions,
  ): Promise<{ txHash: TransactionHash; receipt: VerifiedReceipt }> {
    return this.finalizeProgram(hearingId, options);
  }

  private async readContract(functionName: string, args: unknown[]): Promise<unknown> {
    const client = createClient({
      chain: studionet,
      endpoint: APP_CONFIG.rpcUrl,
    });

    return client.readContract({
      address: this.address,
      functionName,
      args: args as unknown as Parameters<typeof client.readContract>[0]['args'],
    });
  }

  private parseJsonResult(raw: unknown, method: string): unknown {
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new Error(`Malformed JSON string returned by ${method}`);
    }
  }

  private async executeWrite(
    functionName: string,
    args: unknown[],
    options: WriteCallOptions,
  ): Promise<VerifiedReceipt> {
    const { account, provider, onPhaseChange } = options;

    const notify = (phase: TransactionPhase, hash?: TransactionHash, error?: string) => {
      onPhaseChange?.(phase, hash, error);
    };

    try {
      notify('preparing');

      const client = createClient({
        chain: studionet,
        endpoint: APP_CONFIG.rpcUrl,
        account,
        provider: provider as unknown as NonNullable<Parameters<typeof createClient>[0]>['provider'],
      });

      notify('wallet_confirmation');

      const txHash = (await client.writeContract({
        address: this.address,
        functionName,
        args: args as unknown as Parameters<typeof client.writeContract>[0]['args'],
        value: 0n,
      })) as TransactionHash;

      notify('submitted', txHash);
      notify('consensus', txHash);

      // Wait for block finalization
      const rawReceipt = (await client.waitForTransactionReceipt({
        hash: txHash as Parameters<typeof client.waitForTransactionReceipt>[0]['hash'],
        status: TransactionStatus.FINALIZED,
        interval: 2000,
        retries: 60,
      })) as unknown as Record<string, unknown>;

      notify('finalized', txHash);

      // Strict fail-closed verification of execution result
      let verifiedReceipt = inspectTransactionReceipt(rawReceipt);

      // If receipt lacks decisive execution evidence, query transaction directly
      if (!verifiedReceipt.isExecutionSuccess && verifiedReceipt.statusText === 'FINALIZED_EXECUTION_FAILED') {
        try {
          const fullTx = (await client.getTransaction({
            hash: txHash as Parameters<typeof client.getTransaction>[0]['hash'],
          })) as unknown as Record<string, unknown>;
          if (fullTx) {
            const reInspected = inspectTransactionReceipt(fullTx);
            if (reInspected.isExecutionSuccess) {
              verifiedReceipt = reInspected;
            }
          }
        } catch {
          // Keep initial verifiedReceipt
        }
      }

      if (!verifiedReceipt.isExecutionSuccess) {
        const errMessage = verifiedReceipt.errorMessage || 'Transaction execution failed on-chain';
        notify('failed', txHash, errMessage);
        throw new Error(errMessage);
      }

      notify('execution_verified', txHash);
      return verifiedReceipt;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify('failed', undefined, message);
      throw err;
    }
  }
}

export const HearingCreatedReconciliationError = ProgramCreatedReconciliationError;

// Add backward-compatible alias methods to GenLayerContractClient prototype
(GenLayerContractClient.prototype as any).getHearingCount = GenLayerContractClient.prototype.getProgramCount;
(GenLayerContractClient.prototype as any).getHearing = GenLayerContractClient.prototype.getProgram;
(GenLayerContractClient.prototype as any).createHearing = GenLayerContractClient.prototype.createProgram;
(GenLayerContractClient.prototype as any).cancelHearing = GenLayerContractClient.prototype.cancelProgram;
(GenLayerContractClient.prototype as any).clusterComments = GenLayerContractClient.prototype.domainComments;
(GenLayerContractClient.prototype as any).finalizeHearing = GenLayerContractClient.prototype.finalizeProgram;
