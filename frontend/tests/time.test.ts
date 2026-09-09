import { describe, it, expect } from 'vitest';
import {
  isRegistrationOpen,
  isChallengeOpen,
  isFinalizeEligible,
  formatCountdown,
  formatUtcDateTime,
} from '../src/time';

describe('Time & Deadline Predicates for Hearing Lifecycle', () => {
  describe('isRegistrationOpen', () => {
    it('is strictly open when now < registration_deadline', () => {
      expect(isRegistrationOpen(1000, 1001)).toBe(true);
      expect(isRegistrationOpen(1000, 2000)).toBe(true);
    });

    it('is closed at and after registration_deadline', () => {
      expect(isRegistrationOpen(1000, 1000)).toBe(false);
      expect(isRegistrationOpen(1001, 1000)).toBe(false);
    });
  });

  describe('isChallengeOpen', () => {
    it('is strictly open when now < challenge_deadline', () => {
      expect(isChallengeOpen(2000, 2001)).toBe(true);
      expect(isChallengeOpen(2000, 3000)).toBe(true);
    });

    it('is closed at and after challenge_deadline', () => {
      expect(isChallengeOpen(2000, 2000)).toBe(false);
      expect(isChallengeOpen(2001, 2000)).toBe(false);
    });
  });

  describe('isFinalizeEligible', () => {
    it('is eligible strictly when state === CHALLENGE, now >= challenge_deadline, and pending === 0', () => {
      expect(isFinalizeEligible(3000, 'CHALLENGE', 3000, 0)).toBe(true);
      expect(isFinalizeEligible(3001, 'CHALLENGE', 3000, 0)).toBe(true);
    });

    it('is not eligible before challenge deadline', () => {
      expect(isFinalizeEligible(2999, 'CHALLENGE', 3000, 0)).toBe(false);
    });

    it('is not eligible when pending challenges exist', () => {
      expect(isFinalizeEligible(3000, 'CHALLENGE', 3000, 1)).toBe(false);
      expect(isFinalizeEligible(3500, 'CHALLENGE', 3000, 3)).toBe(false);
    });

    it('is not eligible when not in CHALLENGE state', () => {
      expect(isFinalizeEligible(3500, 'COLLECTING', 3000, 0)).toBe(false);
      expect(isFinalizeEligible(3500, 'LOCKED', 3000, 0)).toBe(false);
      expect(isFinalizeEligible(3500, 'CLUSTERED', 3000, 0)).toBe(false);
      expect(isFinalizeEligible(3500, 'FINAL', 3000, 0)).toBe(false);
    });
  });

  describe('formatCountdown', () => {
    it('formats remaining seconds into hours, minutes, and seconds', () => {
      expect(formatCountdown(3665)).toBe('1h 01m 05s');
      expect(formatCountdown(7200)).toBe('2h 00m 00s');
      expect(formatCountdown(59)).toBe('0m 59s');
      expect(formatCountdown(125)).toBe('2m 05s');
    });

    it('returns Deadline Passed for 0 or negative remaining time', () => {
      expect(formatCountdown(0)).toBe('Deadline Passed');
      expect(formatCountdown(-10)).toBe('Deadline Passed');
    });
  });

  describe('formatUtcDateTime', () => {
    it('formats Unix timestamp to UTC ISO civil string', () => {
      const formatted = formatUtcDateTime(1700000000);
      expect(formatted).toContain('2023-11-14');
      expect(formatted).toContain('UTC');
    });

    it('handles 0 or negative timestamps safely', () => {
      expect(formatUtcDateTime(0)).toBe('None');
      expect(formatUtcDateTime(-1)).toBe('None');
    });
  });
});
