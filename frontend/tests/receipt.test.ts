import { describe, it, expect } from 'vitest';
import { TransactionStatus } from 'genlayer-js/types';
import {
  inspectTransactionReceipt,
  formatTxHash,
  getExplorerTxUrl,
  safeFormatError,
} from '../src/receipt';

describe('Transaction Receipt & Fail-Closed Consensus Verification', () => {
  const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const;

  it('verifies finalized successful receipt with finished_with_return', () => {
    const rawReceipt = {
      hash: validHash,
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

    const inspected = inspectTransactionReceipt(rawReceipt);
    expect(inspected.isFinalized).toBe(true);
    expect(inspected.isExecutionSuccess).toBe(true);
    expect(inspected.statusText).toBe('FINALIZED_SUCCESS');
    expect(inspected.hash).toBe(validHash);
    expect(inspected.returnValue).toBe(1);
    expect(inspected.errorMessage).toBeUndefined();
  });

  it('verifies genlayer-js numeric status and execution result codes', () => {
    const rawReceipt = {
      hash: validHash,
      status: 2, // FINALIZED numeric code
      result: 'SUCCESS',
      execution_result: 'FINISHED_WITH_RETURN',
      returnValue: '0xabc',
    };

    const inspected = inspectTransactionReceipt(rawReceipt);
    expect(inspected.isFinalized).toBe(true);
    expect(inspected.isExecutionSuccess).toBe(true);
    expect(inspected.statusText).toBe('FINALIZED_SUCCESS');
  });

  it('fails closed when execution result is FINISHED_WITH_ERROR', () => {
    const rawReceipt = {
      hash: validHash,
      status: TransactionStatus.FINALIZED,
      result: 'SUCCESS', // Node returned status success, but contract reverted
      execution_result: 'FINISHED_WITH_ERROR',
      error: 'Registration deadline has passed',
    };

    const inspected = inspectTransactionReceipt(rawReceipt);
    expect(inspected.isFinalized).toBe(true);
    expect(inspected.isExecutionSuccess).toBe(false);
    expect(inspected.statusText).toBe('FINALIZED_EXECUTION_FAILED');
    expect(inspected.errorMessage).toContain('Registration deadline has passed');
  });

  it('fails closed when consensus agreement indicates disagreement or failure', () => {
    const rawReceipt = {
      hash: validHash,
      status: TransactionStatus.FINALIZED,
      result: 'FAILURE',
      consensus_data: {
        has_consensus: false,
      },
    };

    const inspected = inspectTransactionReceipt(rawReceipt);
    expect(inspected.isFinalized).toBe(true);
    expect(inspected.isExecutionSuccess).toBe(false);
    expect(inspected.errorMessage).toContain('Consensus agreement failure');
  });

  it('fails closed when receipt is unfinalized (PENDING, UNDETERMINED)', () => {
    const rawReceipt = {
      hash: validHash,
      status: TransactionStatus.PENDING,
    };

    const inspected = inspectTransactionReceipt(rawReceipt);
    expect(inspected.isFinalized).toBe(false);
    expect(inspected.isExecutionSuccess).toBe(false);
    expect(inspected.statusText).toBe('PENDING');
    expect(inspected.errorMessage).toContain('expected FINALIZED');
  });

  it('fails closed when receipt is missing or malformed', () => {
    expect(inspectTransactionReceipt(null).isExecutionSuccess).toBe(false);
    expect(inspectTransactionReceipt(undefined).isExecutionSuccess).toBe(false);
    expect(inspectTransactionReceipt([]).isExecutionSuccess).toBe(false);
    expect(inspectTransactionReceipt('receipt').isExecutionSuccess).toBe(false);
    expect(inspectTransactionReceipt({}).isExecutionSuccess).toBe(false);
  });

  it('fails closed on contradictory or ambiguous execution payload', () => {
    const ambiguousReceipt = {
      hash: validHash,
      status: TransactionStatus.FINALIZED,
      result: 'SUCCESS',
      consensus_data: {
        leader_receipt: {
          execution_result: 'FINISHED_WITH_ERROR', // Contradicts status
          error: 'Execution halted by validator',
        },
      },
    };

    const inspected = inspectTransactionReceipt(ambiguousReceipt);
    expect(inspected.isExecutionSuccess).toBe(false);
    expect(inspected.errorMessage).toContain('Execution halted by validator');
  });

  it('formats transaction hash for display safely', () => {
    expect(formatTxHash(validHash)).toBe('0x1234...cdef');
    expect(formatTxHash('0x123')).toBe('0x123');
  });

  it('generates explorer transaction URL correctly', () => {
    expect(getExplorerTxUrl('https://explorer-studio.genlayer.com', validHash)).toBe(
      `https://explorer-studio.genlayer.com/tx/${validHash}`,
    );
    expect(getExplorerTxUrl('https://custom.explorer.com', validHash)).toBe(
      `https://custom.explorer.com/tx/${validHash}`,
    );
  });

  it('safely formats error messages from unknown error objects', () => {
    expect(safeFormatError(new Error('Network failure'))).toBe('Network failure');
    expect(safeFormatError('String error')).toBe('String error');
    expect(safeFormatError({ reason: 'Revert reason' })).toBe('Revert reason');
    expect(safeFormatError({ message: 'Custom msg' })).toBe('Custom msg');
    expect(safeFormatError(null)).toBe('');
  });
});
