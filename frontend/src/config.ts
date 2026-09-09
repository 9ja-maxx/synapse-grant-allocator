/**
 * Application Configuration & Environment Settings
 *
 * Validates deployment-specific settings and provides GenLayer Studionet network parameters.
 * When contract address is unset or invalid, the app enters an honest "Deployment pending" state.
 */

export interface AppConfig {
  readonly contractAddress: `0x${string}` | '';
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly chainName: string;
  readonly currencySymbol: string;
  readonly explorerUrl: string;
  readonly isConfigured: boolean;
  readonly validationError?: string;
}

export function validateContractAddress(address: unknown): { isValid: boolean; error?: string } {
  if (typeof address !== 'string' || address.trim() === '') {
    return { isValid: false, error: 'Contract address is not set (deployment pending).' };
  }
  const clean = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/i.test(clean)) {
    return {
      isValid: false,
      error: `Contract address "${clean}" is invalid. Expected 0x followed by 40 hexadecimal characters.`,
    };
  }
  return { isValid: true };
}

export function loadAppConfig(): AppConfig {
  const rawAddress = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim();
  const addressValidation = validateContractAddress(rawAddress);

  // Studionet defaults confirmed for GenLayer test environment
  const rpcUrl = 'https://studio.genlayer.com/api';
  const chainId = 61999;
  const chainName = 'GenLayer Studionet';
  const currencySymbol = 'GEN';
  const explorerUrl = 'https://explorer-studio.genlayer.com';

  if (!addressValidation.isValid) {
    return {
      contractAddress: '',
      rpcUrl,
      chainId,
      chainName,
      currencySymbol,
      explorerUrl,
      isConfigured: false,
      validationError: addressValidation.error,
    };
  }

  return {
    contractAddress: rawAddress as `0x${string}`,
    rpcUrl,
    chainId,
    chainName,
    currencySymbol,
    explorerUrl,
    isConfigured: true,
  };
}

export const APP_CONFIG = loadAppConfig();
