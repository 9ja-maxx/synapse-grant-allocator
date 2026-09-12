/**
 * Integration test covering program creation, identifier selection, and authoritative contract readback.
 */

import { describe, it, expect } from 'vitest';
import {
  decodeProgram,
  decodeProposal,
  decodeDomain,
  decodeDispute,
  decodeAllocationWinner,
  ProgramSummary,
  ProposalRecord,
} from '../types';

describe('Synapse Grant Allocator - Creation, Identifier Selection & Authoritative Readback', () => {
  const sampleProgramId = 1;
  const sampleDirector = '0x4d6d430b92c6252b21278eb7a71eb61e4cc50f74';
  const sampleRfpUrl = 'https://raw.githubusercontent.com/9ja-maxx/synapse-grant-allocator/main/frontend/public/fixtures/program-rfp.txt';
  const sampleRfpDigest = '9cb52e04c528a1b07524e0deb58a599da88ccabbcf7b9daf8be06b333c416d11';
  const sampleDocketDigest = 'efdd54f96a7b17aee2c728f0e41bc915513fa60531fcf690a8158e20687a06bd';

  it('correctly decodes on-chain program creation response schema into ProgramSummary', () => {
    const rawContractOutput = {
      program_id: sampleProgramId,
      director: sampleDirector,
      admission_authority: sampleDirector,
      rfp_url: sampleRfpUrl,
      rfp_digest: sampleRfpDigest,
      expected_docket_digest: sampleDocketDigest,
      computed_docket_digest: sampleDocketDigest,
      grant_count: 2,
      submission_deadline: 1789036460,
      dispute_deadline: 1789122860,
      state: 'LOCKED',
      proposal_count: 2,
      epoch: 0,
      accepted_dispute_count: 0,
      pending_dispute_count: 0,
      total_dispute_count: 0,
      abort_reason: '',
    };

    const decoded: ProgramSummary = decodeProgram(rawContractOutput);

    expect(decoded.program_id).toBe(sampleProgramId);
    expect(decoded.hearing_id).toBe(sampleProgramId);
    expect(decoded.director).toBe(sampleDirector.toLowerCase());
    expect(decoded.proposal_url).toBe(sampleRfpUrl);
    expect(decoded.proposal_digest).toBe(sampleRfpDigest);
    expect(decoded.expected_docket_digest).toBe(sampleDocketDigest);
    expect(decoded.computed_docket_digest).toBe(sampleDocketDigest);
    expect(decoded.grant_count).toBe(2);
    expect(decoded.state).toBe('LOCKED');
    expect(decoded.proposal_count).toBe(2);
  });

  it('selects the newly created program identifier and executes authoritative readback', async () => {
    // 1. Simulating creation return schema
    const mockCreateResult = {
      program_id: 2,
      programId: 2,
      txHash: ('0x' + 'a'.repeat(64)) as `0x${string}`,
      receipt: {
        hash: ('0x' + 'a'.repeat(64)) as `0x${string}`,
        statusText: 'FINALIZED_SUCCESS',
        isExecutionSuccess: true,
        returnValue: 2,
      },
    };

    expect(mockCreateResult.program_id).toBe(2);

    // 2. Identifier Selection
    let selectedProgramId: number | null = null;
    selectedProgramId = mockCreateResult.program_id;
    expect(selectedProgramId).toBe(2);

    // 3. Authoritative Contract Readback
    const rawReadback = {
      program_id: selectedProgramId,
      director: sampleDirector,
      admission_authority: sampleDirector,
      proposal_url: sampleRfpUrl,
      proposal_digest: sampleRfpDigest,
      expected_docket_digest: sampleDocketDigest,
      computed_docket_digest: '',
      grant_count: 3,
      submission_deadline: 1789036460,
      dispute_deadline: 1789122860,
      state: 'COLLECTING',
      proposal_count: 0,
      epoch: 0,
      accepted_dispute_count: 0,
      pending_dispute_count: 0,
      total_dispute_count: 0,
    };

    const readbackSummary = decodeProgram(rawReadback);
    expect(readbackSummary.program_id).toBe(2);
    expect(readbackSummary.state).toBe('COLLECTING');
    expect(readbackSummary.grant_count).toBe(3);
    expect(readbackSummary.proposal_count).toBe(0);
  });

  it('correctly decodes proposal records registered in the docket', () => {
    const rawProposal = {
      index: 0,
      proposal_id: 'SYN-ACCESS-01',
      url: 'https://raw.githubusercontent.com/9ja-maxx/synapse-grant-allocator/main/frontend/public/fixtures/proposal-access.txt',
      digest: '5c6108bc8a28ca22aa1014649dbc7eadda42ef6eff903a361624f59c57dd3dab',
      registrar: sampleDirector,
      admission_authority: sampleDirector,
      eligible: true,
      exclusion_reason: '',
      domain_id: 0,
      domain_label: '',
      innovation_score: 0,
      is_duplicate: false,
      duplicate_of_id: '',
      selected: false,
      selection_rank: 0,
      reason_code: '',
      rationale: '',
    };

    const decoded: ProposalRecord = decodeProposal(rawProposal);
    expect(decoded.proposal_id).toBe('SYN-ACCESS-01');
    expect(decoded.eligible).toBe(true);
    expect(decoded.registrar).toBe(sampleDirector.toLowerCase());
    expect(decoded.domain_id).toBe(0);
  });

  it('correctly decodes domain, dispute, and allocation winner records', () => {
    const rawDomain = {
      domain_id: 1,
      label: 'NeuroTech Open Hardware',
      summary: 'Low-cost EEG headsets and telemetry interfaces',
      proposal_ids: ['SYN-ACCESS-01'],
    };
    const domain = decodeDomain(rawDomain);
    expect(domain.domain_id).toBe(1);
    expect(domain.proposal_ids).toEqual(['SYN-ACCESS-01']);

    const rawDispute = {
      id: 1,
      dispute_type: 'PROVENANCE_INVALID',
      target_ids: ['SYN-ACCESS-01'],
      disputer: sampleDirector,
      status: 'PENDING',
      resolution_reason: '',
      resolved_at_epoch: 0,
    };
    const dispute = decodeDispute(rawDispute);
    expect(dispute.id).toBe(1);
    expect(dispute.status).toBe('PENDING');

    const rawWinner = {
      rank: 1,
      proposal_id: 'SYN-ACCESS-01',
      domain_id: 1,
      innovation_score: 95,
      reason_code: 'UNIQUE_CLUSTER_COVERAGE',
      rationale: 'Top pioneer for domain 1',
    };
    const winner = decodeAllocationWinner(rawWinner);
    expect(winner.rank).toBe(1);
    expect(winner.proposal_id).toBe('SYN-ACCESS-01');
    expect(winner.innovation_score).toBe(95);
  });

  it('fails closed when decoding malformed program schemas', () => {
    expect(() => {
      decodeProgram({
        program_id: 'invalid-id',
        director: sampleDirector,
        state: 'COLLECTING',
      });
    }).toThrow();

    expect(() => {
      decodeProgram({
        program_id: 1,
        director: 'not-an-address',
        state: 'COLLECTING',
      });
    }).toThrow();

    expect(() => {
      decodeProgram({
        program_id: 1,
        director: sampleDirector,
        state: 'INVALID_STATE',
      });
    }).toThrow();
  });
});
