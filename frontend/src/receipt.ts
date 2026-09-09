/**
 * GenLayer Transaction Receipt Verification & Fail-Closed Consensus Classifier
 *
 * Implements strict, fail-closed terminal classification matching genlayer-js@1.1.8 receipt/transaction shapes.
 *
 * Rules:
 * 1. Transaction hash alone is NOT success.
 * 2. Status must reach FINALIZED.
 * 3. Execution result must be explicitly verified as successful.
 * 4. Missing, contradictory, malformed, or unvoted execution evidence fails closed.
 * 5. BigInt error fields and values are safely serialized without throwing.
 */

import { TransactionStatus, ExecutionResult, TransactionResult } from 'genlayer-js/types';
import { HexAddress, TransactionHash, isHexAddress, isTransactionHash } from './types';

export interface VerifiedReceipt {
  hash: TransactionHash;
  isFinalized: boolean;
  isExecutionSuccess: boolean;
  statusText: string;
  executionResult?: string;
  consensusResult?: string;
  returnValue?: unknown;
  errorMessage?: string;
  leaderAddress?: HexAddress;
}

/**
 * Serialize unknown error or payload values safely, supporting BigInt and nested objects.
 */
export function safeFormatError(err: unknown): string {
  if (err === null || err === undefined) return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  if (typeof err === 'bigint') return err.toString();
  if (err instanceof Error) return err.message;

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.reason === 'string' && obj.reason) return obj.reason;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
    if (typeof obj.error_message === 'string' && obj.error_message) return obj.error_message;
  }

  try {
    return JSON.stringify(err, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
  } catch {
    return String(err);
  }
}

/**
 * Format transaction hash for display (e.g. 0x1234...cdef).
 */
export function formatTxHash(hash: string): string {
  if (!hash || typeof hash !== 'string') return '';
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Build block explorer URL for a given transaction hash.
 */
export function getExplorerTxUrl(explorerBaseUrl: string, hash: string): string {
  const base = (explorerBaseUrl || '').replace(/\/+$/, '');
  return `${base}/tx/${hash}`;
}

/**
 * Strict fail-closed classifier for GenLayer transaction receipts.
 */
export function inspectTransactionReceipt(rawReceipt: unknown): VerifiedReceipt {
  if (!rawReceipt || typeof rawReceipt !== 'object' || Array.isArray(rawReceipt)) {
    return {
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      isFinalized: false,
      isExecutionSuccess: false,
      statusText: 'INVALID_RECEIPT',
      errorMessage: 'Transaction receipt is missing or malformed (expected non-null object).',
    };
  }

  const receipt = rawReceipt as Record<string, unknown>;

  // 1. Extract and validate transaction hash
  const rawHash = receipt.hash ?? receipt.txId ?? receipt.tx_id ?? receipt.transaction_id ?? '';
  const hashString = typeof rawHash === 'string' ? rawHash.trim() : '';
  const validHash: TransactionHash = isTransactionHash(hashString)
    ? (hashString as TransactionHash)
    : ('0x0000000000000000000000000000000000000000000000000000000000000000' as TransactionHash);

  // 2. Classify Transaction Status
  const rawStatus = receipt.statusName ?? receipt.status_name ?? receipt.status ?? '';
  const statusStr = String(rawStatus).trim().toUpperCase();

  const isFinalized =
    statusStr === TransactionStatus.FINALIZED ||
    statusStr === 'FINALIZED' ||
    statusStr === '2' ||
    statusStr === '7';

  if (!isFinalized) {
    const descriptiveStatus = statusStr || 'UNKNOWN';
    return {
      hash: validHash,
      isFinalized: false,
      isExecutionSuccess: false,
      statusText: descriptiveStatus,
      errorMessage: `Transaction has not achieved finality (current status: "${descriptiveStatus}", expected FINALIZED).`,
    };
  }

  // 3. Inspect Consensus Agreement & Results
  const rawConsensusResult = receipt.resultName ?? receipt.result_name ?? receipt.result;
  let consensusResultStr: string | undefined;
  if (rawConsensusResult !== undefined && rawConsensusResult !== null) {
    consensusResultStr = String(rawConsensusResult).toUpperCase();
  }

  let consensusAgreed = true;
  let consensusError: string | undefined;

  const consensusData = receipt.consensus_data as Record<string, unknown> | undefined;

  if (consensusData && consensusData.has_consensus === false) {
    consensusAgreed = false;
    consensusError = 'Consensus agreement failure (has_consensus: false).';
  } else if (consensusResultStr) {
    if (
      consensusResultStr === TransactionResult.DISAGREE ||
      consensusResultStr === TransactionResult.MAJORITY_DISAGREE ||
      consensusResultStr === 'DISAGREE' ||
      consensusResultStr === 'MAJORITY_DISAGREE' ||
      consensusResultStr === '2' ||
      consensusResultStr === '7'
    ) {
      consensusAgreed = false;
      consensusError = `Validator consensus disagreed with execution result (${consensusResultStr}).`;
    } else if (
      consensusResultStr === TransactionResult.TIMEOUT ||
      consensusResultStr === 'TIMEOUT' ||
      consensusResultStr === '3'
    ) {
      consensusAgreed = false;
      consensusError = 'Transaction timed out during validator consensus round.';
    } else if (
      consensusResultStr === TransactionResult.DETERMINISTIC_VIOLATION ||
      consensusResultStr === 'DETERMINISTIC_VIOLATION' ||
      consensusResultStr === '4'
    ) {
      consensusAgreed = false;
      consensusError = 'Deterministic violation detected during validator consensus.';
    } else if (
      consensusResultStr === TransactionResult.NO_MAJORITY ||
      consensusResultStr === 'NO_MAJORITY' ||
      consensusResultStr === '5'
    ) {
      consensusAgreed = false;
      consensusError = 'No consensus majority reached among round validators.';
    } else if (consensusResultStr === 'FAILURE' || consensusResultStr === 'FAILED') {
      consensusAgreed = false;
      consensusError = `Consensus agreement failure (status: ${consensusResultStr}).`;
    }
  }

  // 4. Classify Execution Results
  // A. Top-level txExecutionResult
  const rawExecResult =
    receipt.txExecutionResultName ??
    receipt.tx_execution_result_name ??
    receipt.txExecutionResult ??
    receipt.tx_execution_result ??
    receipt.execution_result ??
    receipt.executionResult;

  const topLevelErrorMsg = receipt.error ?? receipt.error_message ?? receipt.errorMessage;

  let topLevelSuccess: boolean | null = null;
  let topLevelError: string | undefined = topLevelErrorMsg ? safeFormatError(topLevelErrorMsg) : undefined;
  let executionResultName: string | undefined;

  if (rawExecResult !== undefined && rawExecResult !== null) {
    const execStr = String(rawExecResult).toUpperCase();
    executionResultName = execStr;

    if (
      execStr === ExecutionResult.FINISHED_WITH_RETURN ||
      execStr === 'FINISHED_WITH_RETURN' ||
      execStr === '1' ||
      execStr === 'SUCCESS'
    ) {
      topLevelSuccess = true;
    } else if (
      execStr === ExecutionResult.FINISHED_WITH_ERROR ||
      execStr === 'FINISHED_WITH_ERROR' ||
      execStr === '2' ||
      execStr === 'ERROR' ||
      execStr === 'FAILURE'
    ) {
      topLevelSuccess = false;
      if (!topLevelError) {
        topLevelError = 'Contract execution reverted or finished with error.';
      }
    } else if (
      execStr === ExecutionResult.NOT_VOTED ||
      execStr === 'NOT_VOTED' ||
      execStr === '0'
    ) {
      topLevelSuccess = false;
      topLevelError = 'Contract execution was not voted on by validators.';
    } else {
      topLevelSuccess = false;
      topLevelError = `Unrecognized top-level execution result: "${execStr}".`;
    }
  }

  // B. Consensus Data Leader Receipt
  let leaderSuccess: boolean | null = null;
  let leaderError: string | undefined;
  let returnValue: unknown = undefined;
  let leaderAddress: HexAddress | undefined;

  const rawLeaderReceipts = consensusData?.leader_receipt;

  if (rawLeaderReceipts) {
    const leaderReceiptList = Array.isArray(rawLeaderReceipts)
      ? (rawLeaderReceipts as Record<string, unknown>[])
      : [rawLeaderReceipts as Record<string, unknown>];

    if (leaderReceiptList.length > 0) {
      const primaryLeader = leaderReceiptList[0];
      const lrExec = primaryLeader.execution_result ?? primaryLeader.genvm_result;
      const lrError = primaryLeader.error ?? primaryLeader.error_message;
      const lrResult = primaryLeader.result ?? primaryLeader.calldata;

      if (primaryLeader.leader_address && isHexAddress(String(primaryLeader.leader_address))) {
        leaderAddress = String(primaryLeader.leader_address).toLowerCase() as HexAddress;
      }

      if (lrResult !== undefined && lrResult !== null) {
        returnValue = lrResult;
      }

      if (lrError) {
        leaderSuccess = false;
        leaderError = safeFormatError(lrError);
      } else if (lrExec) {
        const lrExecStr = String(lrExec).toUpperCase();
        if (
          lrExecStr === 'SUCCESS' ||
          lrExecStr === 'FINISHED_WITH_RETURN' ||
          lrExecStr === ExecutionResult.FINISHED_WITH_RETURN
        ) {
          leaderSuccess = true;
        } else if (
          lrExecStr === 'ERROR' ||
          lrExecStr === 'FAILURE' ||
          lrExecStr === 'FINISHED_WITH_ERROR' ||
          lrExecStr === ExecutionResult.FINISHED_WITH_ERROR
        ) {
          leaderSuccess = false;
          leaderError = `Leader execution failed with status "${lrExecStr}".`;
        } else {
          leaderSuccess = false;
          leaderError = `Leader execution produced unrecognized result: "${lrExecStr}".`;
        }
      }
    }
  }

  // 5. Synthesize & Check for Contradictions (Fail Closed)
  if (!consensusAgreed) {
    return {
      hash: validHash,
      isFinalized: true,
      isExecutionSuccess: false,
      statusText: 'FINALIZED_CONSENSUS_REJECTED',
      consensusResult: consensusResultStr,
      executionResult: executionResultName,
      errorMessage: topLevelError || leaderError || consensusError || 'Transaction failed validator consensus.',
    };
  }

  // If both are present and contradict each other -> Fail Closed
  if (topLevelSuccess !== null && leaderSuccess !== null && topLevelSuccess !== leaderSuccess) {
    return {
      hash: validHash,
      isFinalized: true,
      isExecutionSuccess: false,
      statusText: 'FINALIZED_CONTRADICTORY_EVIDENCE',
      consensusResult: consensusResultStr,
      executionResult: executionResultName,
      errorMessage:
        'Contradictory execution evidence in receipt: top-level result contradicts leader receipt.',
    };
  }

  // Determine synthesized execution success
  const isExecutionSuccess =
    (topLevelSuccess === true && leaderSuccess !== false) ||
    (leaderSuccess === true && topLevelSuccess !== false);

  if (!isExecutionSuccess) {
    const errorDetail =
      topLevelError ||
      leaderError ||
      'Transaction finalized but lacks authoritative proof of successful contract execution (failed closed).';

    return {
      hash: validHash,
      isFinalized: true,
      isExecutionSuccess: false,
      statusText: 'FINALIZED_EXECUTION_FAILED',
      consensusResult: consensusResultStr,
      executionResult: executionResultName,
      errorMessage: errorDetail,
      leaderAddress,
    };
  }

  return {
    hash: validHash,
    isFinalized: true,
    isExecutionSuccess: true,
    statusText: 'FINALIZED_SUCCESS',
    consensusResult: consensusResultStr,
    executionResult: executionResultName || 'SUCCESS',
    returnValue,
    leaderAddress,
  };
}
