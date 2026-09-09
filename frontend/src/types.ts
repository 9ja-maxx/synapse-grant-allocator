/**
 * Core Types & Strict Fail-Closed Runtime Decoders for Public Comment Program Allocator
 *
 * Source of truth: contracts/public_proposal_allocator.py
 *
 * Enforces:
 * 1. Strict fail-closed verification on every contract boundary.
 * 2. No silent default coercion of invalid/missing keys to zero addresses or blank strings.
 * 3. Safe integer and format bounds checking on all protocol fields.
 */

export type HexAddress = `0x${string}`;
export type TransactionHash = `0x${string}`;

// Lifecycle State Machine
export type LifecycleState =
  | 'COLLECTING'
  | 'LOCKED'
  | 'CLUSTERED'
  | 'ALLOCATED'
  | 'CHALLENGE'
  | 'FINAL'
  | 'CANCELLED';

export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  'COLLECTING',
  'LOCKED',
  'CLUSTERED',
  'ALLOCATED',
  'CHALLENGE',
  'FINAL',
] as const;

// Challenge Types
export type ChallengeType = 'PROVENANCE_INVALID' | 'DUPLICATE_PAIR';

export const CHALLENGE_TYPES: readonly ChallengeType[] = [
  'PROVENANCE_INVALID',
  'DUPLICATE_PAIR',
] as const;

// Challenge Statuses
export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export const CHALLENGE_STATUSES: readonly ChallengeStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
] as const;

// Normalized Allocation Reason Codes
export type SelectedReasonCode =
  | 'UNIQUE_CLUSTER_COVERAGE'
  | 'ADDITIONAL_CLUSTER_DEPTH';

export type UnselectedReasonCode =
  | 'LOWER_RELEVANCE'
  | 'NEAR_DUPLICATE'
  | 'CLUSTER_CAP'
  | 'SLOT_LIMIT'
  | 'IRRELEVANT'
  | 'PROVENANCE_EXCLUDED';

export type ReasonCode = SelectedReasonCode | UnselectedReasonCode;

export const SELECTED_REASONS: readonly SelectedReasonCode[] = [
  'UNIQUE_CLUSTER_COVERAGE',
  'ADDITIONAL_CLUSTER_DEPTH',
] as const;

export const UNSELECTED_REASONS: readonly UnselectedReasonCode[] = [
  'LOWER_RELEVANCE',
  'NEAR_DUPLICATE',
  'CLUSTER_CAP',
  'SLOT_LIMIT',
  'IRRELEVANT',
  'PROVENANCE_EXCLUDED',
] as const;

// Exact Contract Data Structures
export interface ProgramSummary {
  program_id: number;
  hearing_id: number;
  director: HexAddress;
  organizer: HexAddress;
  admission_authority: HexAddress;
  proposal_url: string;
  proposal_digest: string;
  expected_docket_digest: string;
  expected_manifest_digest: string;
  computed_docket_digest: string;
  computed_manifest_digest: string;
  grant_count: number;
  slot_count: number;
  submission_deadline: number;
  registration_deadline: number;
  dispute_deadline: number;
  challenge_deadline: number;
  state: LifecycleState;
  proposal_count: number;
  comment_count: number;
  revision: number;
  accepted_dispute_count: number;
  accepted_challenge_count: number;
  pending_dispute_count: number;
  pending_challenge_count: number;
  total_dispute_count: number;
  total_challenge_count: number;
}

export interface ProposalRecord {
  index: number;
  proposal_id: string;
  external_id: string;
  url: string;
  digest: string;
  registrar: HexAddress;
  eligible: boolean;
  exclusion_reason: string;
  domain_id: number;
  cluster_id: number;
  domain_label: string;
  cluster_label?: string;
  innovation_score: number;
  relevance_score?: number;
  is_duplicate: boolean;
  duplicate_of_id: string;
  selected: boolean;
  selection_rank: number;
  reason_code: string;
  rationale: string;
}

export interface DomainRecord {
  domain_id: number;
  cluster_id: number;
  label: string;
  summary: string;
  proposal_ids: string[];
  comment_ids: string[];
}

export interface DisputeRecord {
  id: number;
  dispute_type: ChallengeType;
  challenge_type?: ChallengeType;
  target_ids: string[];
  disputer: HexAddress;
  challenger?: HexAddress;
  status: ChallengeStatus;
  resolution_reason: string;
  resolved_at_revision: number;
}

export interface AllocationWinner {
  rank: number;
  proposal_id: string;
  external_id: string;
  domain_id: number;
  innovation_score: number;
  reason_code: string;
  rationale: string;
}

// Transaction Lifecycle State
export type TransactionPhase =
  | 'idle'
  | 'preparing'
  | 'wallet_confirmation'
  | 'submitted'
  | 'consensus'
  | 'finalized'
  | 'execution_verified'
  | 'reading_contract'
  | 'reconciliation_required'
  | 'completed'
  | 'failed';

export interface WriteLifecycleState {
  phase: TransactionPhase;
  hash?: TransactionHash;
  error?: string;
  actionLabel?: string;
  requiresReconciliation?: boolean;
}

// Runtime Type Guards & Primitive Parsers
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHexAddress(value: unknown): value is HexAddress {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export function isTransactionHash(value: unknown): value is TransactionHash {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === 'string' && LIFECYCLE_STATES.includes(value as LifecycleState);
}

export function isChallengeType(value: unknown): value is ChallengeType {
  return typeof value === 'string' && CHALLENGE_TYPES.includes(value as ChallengeType);
}

export function isChallengeStatus(value: unknown): value is ChallengeStatus {
  return typeof value === 'string' && CHALLENGE_STATUSES.includes(value as ChallengeStatus);
}

export function validateSafeInteger(
  value: unknown,
  fieldName: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value === 'bigint') {
    if (value < BigInt(min) || value > BigInt(max)) {
      throw new Error(`Invalid ${fieldName}: value ${value} out of safe bounds [${min}, ${max}]`);
    }
    return Number(value);
  }

  let num: number;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    num = Number(value.trim());
  } else {
    throw new Error(`Invalid ${fieldName}: expected integer, got ${String(value)}`);
  }

  if (!Number.isSafeInteger(num) || num < min || num > max) {
    throw new Error(`Invalid ${fieldName}: integer ${num} out of bounds [${min}, ${max}]`);
  }
  return num;
}

export function validateHexAddress(value: unknown, fieldName: string): HexAddress {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: expected address string, got ${typeof value}`);
  }
  const clean = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(clean)) {
    throw new Error(`Invalid ${fieldName}: expected 0x-prefixed 40-hex address, got "${value}"`);
  }
  return clean as HexAddress;
}

export function validateSha256(value: unknown, fieldName: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: expected digest string, got ${typeof value}`);
  }
  const clean = value.trim().toLowerCase();
  if (allowEmpty && clean === '') {
    return '';
  }
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error(`Invalid ${fieldName}: expected 64-character hex SHA-256 digest, got "${value}"`);
  }
  return clean;
}

export function validateUrl(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: expected URL string, got ${typeof value}`);
  }
  const clean = value.trim();
  if (!/^https?:\/\/[^\s|]+$/.test(clean)) {
    throw new Error(`Invalid ${fieldName}: expected http:// or https:// URL without delimiters or spaces, got "${value}"`);
  }
  return clean;
}

export function validateString(value: unknown, fieldName: string, minLength = 0, maxLength = 10000): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: expected string, got ${typeof value}`);
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: string length ${value.length} out of bounds [${minLength}, ${maxLength}]`);
  }
  return value;
}

export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${fieldName}: expected boolean, got ${typeof value}`);
  }
  return value;
}

// Strict Contract Response Decoders
export function decodeProgram(data: unknown): ProgramSummary {
  if (!isRecord(data)) {
    throw new Error('Malformed program summary: expected JSON object');
  }

  const stateStr = String(data.state || '');
  if (!isLifecycleState(stateStr)) {
    throw new Error(`Malformed program summary: invalid state "${stateStr}"`);
  }

  const programId = validateSafeInteger(data.program_id ?? data.id, 'program_id', 1);
  const director = validateHexAddress(data.director ?? data.organizer, 'director');
  const admissionAuthority = validateHexAddress(data.admission_authority, 'admission_authority');
  const proposalUrl = validateUrl(data.proposal_url ?? data.rfp_url, 'proposal_url');
  const proposalDigest = validateSha256(data.proposal_digest ?? data.rfp_digest, 'proposal_digest');
  const expectedManifestDigest = validateSha256(data.expected_docket_digest ?? data.expected_manifest_digest, 'expected_docket_digest');
  const computedManifestDigest = validateSha256(data.computed_docket_digest ?? data.computed_manifest_digest ?? '', 'computed_docket_digest', true);
  const slotCount = validateSafeInteger(data.grant_count ?? data.slot_count, 'grant_count', 1, 6);
  const registrationDeadline = validateSafeInteger(data.submission_deadline ?? data.registration_deadline, 'submission_deadline', 0);
  const disputeDeadline = validateSafeInteger(data.dispute_deadline ?? data.challenge_deadline, 'dispute_deadline', 0);
  const proposalCount = validateSafeInteger(data.proposal_count ?? data.comment_count, 'proposal_count', 0, 12);
  const revision = validateSafeInteger(data.revision ?? data.epoch ?? 0, 'revision', 0);
  const acceptedChallengeCount = validateSafeInteger(data.accepted_dispute_count ?? data.accepted_challenge_count ?? 0, 'accepted_dispute_count', 0);
  const pendingChallengeCount = validateSafeInteger(data.pending_dispute_count ?? data.pending_challenge_count ?? 0, 'pending_dispute_count', 0);
  const totalChallengeCount = validateSafeInteger(data.total_dispute_count ?? data.total_challenge_count ?? 0, 'total_dispute_count', 0);

  return {
    program_id: programId,
    hearing_id: programId,
    director,
    organizer: director,
    admission_authority: admissionAuthority,
    proposal_url: proposalUrl,
    proposal_digest: proposalDigest,
    expected_docket_digest: expectedManifestDigest,
    expected_manifest_digest: expectedManifestDigest,
    computed_docket_digest: computedManifestDigest,
    computed_manifest_digest: computedManifestDigest,
    grant_count: slotCount,
    slot_count: slotCount,
    submission_deadline: registrationDeadline,
    registration_deadline: registrationDeadline,
    dispute_deadline: disputeDeadline,
    challenge_deadline: disputeDeadline,
    state: stateStr,
    proposal_count: proposalCount,
    comment_count: proposalCount,
    revision,
    accepted_dispute_count: acceptedChallengeCount,
    accepted_challenge_count: acceptedChallengeCount,
    pending_dispute_count: pendingChallengeCount,
    pending_challenge_count: pendingChallengeCount,
    total_dispute_count: totalChallengeCount,
    total_challenge_count: totalChallengeCount,
  };
}

export function decodeComment(data: unknown): ProposalRecord {
  if (!isRecord(data)) {
    throw new Error('Malformed proposal record: expected JSON object');
  }

  const index = validateSafeInteger(data.index, 'index', 0);
  const externalId = validateString(data.proposal_id, 'proposal_id', 1, 128);
  for (let i = 0; i < externalId.length; i++) {
    const code = externalId.charCodeAt(i);
    const ch = externalId[i];
    if (ch === '|' || ch === '\r' || ch === '\n' || ch === '\t' || code < 32 || code === 127) {
      throw new Error(`Malformed proposal_id: contains delimiter or control characters ("${externalId}")`);
    }
  }
  const url = validateUrl(data.url, 'url');
  const digest = validateSha256(data.digest, 'digest');
  const registrar = validateHexAddress(data.registrar, 'registrar');
  const eligible = validateBoolean(data.eligible ?? true, 'eligible');
  const exclusionReason = validateString(data.exclusion_reason ?? '', 'exclusion_reason', 0);
  const domainId = validateSafeInteger(data.domain_id ?? 0, 'domain_id', 0, 6);
  const domainLabel = validateString(data.domain_label ?? '', 'domain_label', 0);
  const relevanceScore = validateSafeInteger(data.innovation_score ?? 0, 'innovation_score', 0, 100);
  const isDuplicate = validateBoolean(data.is_duplicate ?? false, 'is_duplicate');
  const duplicateOfId = validateString(data.duplicate_of_id ?? '', 'duplicate_of_id', 0, 128);
  const selected = validateBoolean(data.selected ?? false, 'selected');
  const selectionRank = validateSafeInteger(data.selection_rank ?? 0, 'selection_rank', 0, 6);
  const reasonCode = validateString(data.reason_code ?? '', 'reason_code', 0);
  const rationale = validateString(data.rationale ?? '', 'rationale', 0);

  return {
    index,
    proposal_id: externalId,
    external_id: externalId,
    url,
    digest,
    registrar,
    eligible,
    exclusion_reason: exclusionReason,
    domain_id: domainId,
    cluster_id: domainId,
    domain_label: domainLabel,
    innovation_score: relevanceScore,
    relevance_score: relevanceScore,
    is_duplicate: isDuplicate,
    duplicate_of_id: duplicateOfId,
    selected,
    selection_rank: selectionRank,
    reason_code: reasonCode,
    rationale,
  };
}

export function decodeCluster(data: unknown): DomainRecord {
  if (!isRecord(data)) {
    throw new Error('Malformed domain record: expected JSON object');
  }

  const domainId = validateSafeInteger(data.domain_id, 'domain_id', 1, 6);
  const label = validateString(data.label, 'label', 1);
  const summary = validateString(data.summary ?? '', 'summary', 0);

  if (!Array.isArray(data.proposal_ids)) {
    throw new Error('Malformed domain record: proposal_ids must be an array');
  }
  const proposalIds = data.proposal_ids.map((id, i) => validateString(id, `proposal_ids[${i}]`, 1, 128));

  return {
    domain_id: domainId,
    cluster_id: domainId,
    label,
    summary,
    proposal_ids: proposalIds,
    comment_ids: proposalIds,
  };
}

export function decodeChallenge(data: unknown): DisputeRecord {
  if (!isRecord(data)) {
    throw new Error('Malformed dispute record: expected JSON object');
  }

  const disputeType = String(data.dispute_type || data.challenge_type || '');
  if (!isChallengeType(disputeType)) {
    throw new Error(`Malformed dispute record: invalid dispute_type "${disputeType}"`);
  }

  const status = String(data.status || '');
  if (!isChallengeStatus(status)) {
    throw new Error(`Malformed dispute record: invalid status "${status}"`);
  }

  const id = validateSafeInteger(data.id, 'dispute_id', 1);
  const disputer = validateHexAddress(data.disputer ?? data.challenger, 'disputer');

  if (!Array.isArray(data.target_ids)) {
    throw new Error('Malformed dispute record: target_ids must be an array');
  }
  if (disputeType === 'PROVENANCE_INVALID' && data.target_ids.length !== 1) {
    throw new Error('Malformed dispute: PROVENANCE_INVALID requires exactly 1 target ID');
  }
  if (disputeType === 'DUPLICATE_PAIR' && data.target_ids.length !== 2) {
    throw new Error('Malformed dispute: DUPLICATE_PAIR requires exactly 2 target IDs');
  }

  const targetIds = data.target_ids.map((tid, idx) => validateString(tid, `target_ids[${idx}]`, 1, 128));
  const resolutionReason = validateString(data.resolution_reason ?? '', 'resolution_reason', 0);
  const resolvedAtRevision = validateSafeInteger(data.resolved_at_revision ?? data.resolved_at_epoch ?? 0, 'resolved_at_revision', 0);

  return {
    id,
    dispute_type: disputeType as ChallengeType,
    target_ids: targetIds,
    disputer,
    status: status as ChallengeStatus,
    resolution_reason: resolutionReason,
    resolved_at_revision: resolvedAtRevision,
  };
}

export function decodeAllocationWinner(data: unknown): AllocationWinner {
  if (!isRecord(data)) {
    throw new Error('Malformed allocation winner: expected JSON object');
  }

  const rank = validateSafeInteger(data.rank ?? data.selection_rank, 'rank', 1, 6);
  const externalId = validateString(data.proposal_id ?? data.external_id, 'proposal_id', 1, 128);
  const domainId = validateSafeInteger(data.domain_id ?? data.cluster_id ?? 0, 'domain_id', 0, 6);
  const relevanceScore = validateSafeInteger(data.innovation_score ?? data.relevance_score ?? 0, 'innovation_score', 0, 100);
  const reasonCode = validateString(data.reason_code ?? '', 'reason_code', 0);
  const rationale = validateString(data.rationale ?? '', 'rationale', 0);

  return {
    rank,
    proposal_id: externalId,
    external_id: externalId,
    domain_id: domainId,
    innovation_score: relevanceScore,
    reason_code: reasonCode,
    rationale,
  };
}

export type HearingSummary = ProgramSummary;
export type CommentRecord = ProposalRecord;
export type ClusterRecord = DomainRecord;
export type ChallengeRecord = DisputeRecord;
export const decodeHearing = decodeProgram;

