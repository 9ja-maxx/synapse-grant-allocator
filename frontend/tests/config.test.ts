import { describe, it, expect } from 'vitest';
import { validateContractAddress, loadAppConfig } from '../src/config';

describe('Config & Address Validation', () => {
  it('validates correct 0x-prefixed 40-hex character Ethereum addresses', () => {
    const valid = '0x1234567890abcdef1234567890abcdef12345678';
    expect(validateContractAddress(valid).isValid).toBe(true);
    expect(validateContractAddress(valid.toUpperCase()).isValid).toBe(true);
  });

  it('rejects empty, missing, or invalid addresses', () => {
    expect(validateContractAddress('').isValid).toBe(false);
    expect(validateContractAddress('   ').isValid).toBe(false);
    expect(validateContractAddress(undefined).isValid).toBe(false);
    expect(validateContractAddress(null).isValid).toBe(false);
    expect(validateContractAddress('0x123').isValid).toBe(false);
    expect(validateContractAddress('1234567890abcdef1234567890abcdef12345678').isValid).toBe(false);
    expect(validateContractAddress('0x1234567890abcdef1234567890abcdef1234567g').isValid).toBe(false);
  });

  it('loads default Studionet configuration correctly', () => {
    const config = loadAppConfig();
    expect(config.rpcUrl).toBe('https://studio.genlayer.com/api');
    expect(config.chainId).toBe(61999);
    expect(config.chainName).toBe('GenLayer Studionet');
    expect(config.currencySymbol).toBe('GEN');
    expect(config.explorerUrl).toBe('https://explorer-studio.genlayer.com');
  });
});
