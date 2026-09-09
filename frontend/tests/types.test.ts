import { describe, it, expect } from 'vitest';
import {
  isHexAddress,
  isLifecycleState,
  isChallengeType,
  isChallengeStatus,
  decodeHearing,
  decodeComment,
  decodeCluster,
  decodeChallenge,
  decodeAllocationWinner,
} from '../src/types';

describe('Types and Runtime Decoders', () => {
  it('validates hex addresses', () => {
    expect(isHexAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isHexAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    expect(isHexAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
    expect(isHexAddress('0x123')).toBe(false);
  });

  it('validates lifecycle states', () => {
    expect(isLifecycleState('COLLECTING')).toBe(true);
    expect(isLifecycleState('LOCKED')).toBe(true);
    expect(isLifecycleState('CLUSTERED')).toBe(true);
    expect(isLifecycleState('ALLOCATED')).toBe(true);
    expect(isLifecycleState('CHALLENGE')).toBe(true);
    expect(isLifecycleState('FINAL')).toBe(true);
    expect(isLifecycleState('INVALID_STATE')).toBe(false);
  });

  it('validates challenge types and statuses', () => {
    expect(isChallengeType('PROVENANCE_INVALID')).toBe(true);
    expect(isChallengeType('DUPLICATE_PAIR')).toBe(true);
    expect(isChallengeType('UNKNOWN')).toBe(false);

    expect(isChallengeStatus('PENDING')).toBe(true);
    expect(isChallengeStatus('ACCEPTED')).toBe(true);
    expect(isChallengeStatus('REJECTED')).toBe(true);
    expect(isChallengeStatus('UNKNOWN')).toBe(false);
  });

  it('decodes literal contract get_hearing response', () => {
    const rawHearing = {
      hearing_id: 1,
      organizer: '0x1234567890abcdef1234567890abcdef12345678',
      admission_authority: '0x1234567890abcdef1234567890abcdef12345678',
      proposal_url: 'https://example.gov/p1.txt',
      proposal_digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      expected_manifest_digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      computed_manifest_digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      slot_count: 3,
      registration_deadline: 1800000000,
      challenge_deadline: 1800003600,
      state: 'LOCKED',
      comment_count: 5,
      revision: 0,
      accepted_challenge_count: 0,
      pending_challenge_count: 0,
      total_challenge_count: 0,
    };

    const decoded = decodeHearing(rawHearing);
    expect(decoded.hearing_id).toBe(1);
    expect(decoded.organizer).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(decoded.state).toBe('LOCKED');
    expect(decoded.slot_count).toBe(3);
    expect(decoded.comment_count).toBe(5);
  });

  it('decodes literal contract comment record', () => {
    const rawComment = {
      index: 0,
      external_id: 'DOC-001',
      url: 'https://example.gov/c1.txt',
      digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      registrar: '0x1234567890abcdef1234567890abcdef12345678',
      eligible: true,
      exclusion_reason: '',
      cluster_id: 1,
      cluster_label: 'Environmental Impact',
      relevance_score: 85,
      is_duplicate: false,
      duplicate_of_id: '',
      selected: true,
      selection_rank: 1,
      reason_code: 'UNIQUE_CLUSTER_COVERAGE',
      rationale: 'Primary representative for cluster 1',
    };

    const decoded = decodeComment(rawComment);
    expect(decoded.external_id).toBe('DOC-001');
    expect(decoded.cluster_id).toBe(1);
    expect(decoded.selected).toBe(true);
    expect(decoded.reason_code).toBe('UNIQUE_CLUSTER_COVERAGE');
  });

  it('decodes cluster, challenge, and allocation winner records', () => {
    const rawCluster = {
      cluster_id: 1,
      label: 'Economic Policy',
      summary: 'Comments regarding macroeconomic impacts',
      comment_ids: ['DOC-1', 'DOC-2'],
    };
    const decodedCluster = decodeCluster(rawCluster);
    expect(decodedCluster.cluster_id).toBe(1);
    expect(decodedCluster.comment_ids).toEqual(['DOC-1', 'DOC-2']);

    const rawChallenge = {
      id: 1,
      challenge_type: 'PROVENANCE_INVALID',
      target_ids: ['DOC-1'],
      challenger: '0x1234567890abcdef1234567890abcdef12345678',
      status: 'PENDING',
      resolution_reason: '',
      resolved_at_revision: 0,
    };
    const decodedChallenge = decodeChallenge(rawChallenge);
    expect(decodedChallenge.id).toBe(1);
    expect(decodedChallenge.status).toBe('PENDING');

    const rawWinner = {
      rank: 1,
      external_id: 'DOC-1',
      cluster_id: 1,
      relevance_score: 90,
      reason_code: 'UNIQUE_CLUSTER_COVERAGE',
      rationale: 'Top score in cluster 1',
    };
    const decodedWinner = decodeAllocationWinner(rawWinner);
    expect(decodedWinner.rank).toBe(1);
    expect(decodedWinner.external_id).toBe('DOC-1');
  });

  it('throws informative error on malformed records', () => {
    expect(() => decodeHearing({ state: 'INVALID' })).toThrow(/Malformed/);
    expect(() => decodeChallenge({ challenge_type: 'INVALID' })).toThrow(/Malformed/);
  });
});
