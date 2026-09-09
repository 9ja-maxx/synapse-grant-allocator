/**
 * Time & Deadline Predicates for Hearing Lifecycle Enforcement
 *
 * Source of truth: contracts/public_comment_allocator.py
 *
 * Rules:
 * 1. Registration is OPEN strictly while now < registration_deadline (closed at and after deadline).
 * 2. Challenge is OPEN strictly while now < challenge_deadline (closed at and after deadline).
 * 3. Finalization is ELIGIBLE strictly when state === 'CHALLENGE', now >= challenge_deadline, and pending_challenges === 0.
 */

import { useState, useEffect } from 'react';
import { LifecycleState } from './types';

/**
 * Check if comment registration is currently open.
 */
export function isRegistrationOpen(nowSec: number, registrationDeadlineSec: number): boolean {
  return nowSec < registrationDeadlineSec;
}

/**
 * Check if dispute challenges can be opened.
 */
export function isChallengeOpen(nowSec: number, challengeDeadlineSec: number): boolean {
  return nowSec < challengeDeadlineSec;
}

/**
 * Check if the hearing can be finalized.
 */
export function isFinalizeEligible(
  nowSec: number,
  state: LifecycleState,
  challengeDeadlineSec: number,
  pendingChallengeCount: number,
): boolean {
  return state === 'CHALLENGE' && nowSec >= challengeDeadlineSec && pendingChallengeCount === 0;
}

/**
 * React hook providing a ticking Unix timestamp in seconds.
 * Triggers re-renders at specified interval to keep time-dependent UI active.
 */
export function useTickingTimestamp(intervalMs = 1000): number {
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return nowSec;
}

/**
 * Format remaining seconds into a concise human-readable string (e.g. "02h 15m 30s" or "Deadline Passed").
 */
export function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) {
    return 'Deadline Passed';
  }
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Format a UTC timestamp (seconds) into ISO / standard civil date string.
 */
export function formatUtcDateTime(timestampSec: number): string {
  if (!timestampSec || timestampSec <= 0) return 'None';
  try {
    return new Date(timestampSec * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  } catch {
    return String(timestampSec);
  }
}

