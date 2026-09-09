/**
 * EIP-6963 Multi-Provider Discovery & Hardened Wallet Session Manager
 *
 * Strict Policies:
 * 1. Allowlisted RDNS only: MetaMask (io.metamask*), OKX Wallet (com.okx.wallet, com.okex.wallet), Rabby (io.rabby).
 * 2. Unallowlisted RDNS rejected regardless of display name or icon (forgery protection).
 * 3. Exact object binding: all requests/listeners routed exclusively to selected provider instance.
 * 4. Stable listener lifecycle: accountsChanged/chainChanged registered on connect and cleanly removed on disconnect/switch/unmount.
 * 5. Account removal triggers clean disconnect; unsupported chain invalidates write readiness.
 * 6. Zero persistence: no localStorage, sessionStorage, cookies, IndexedDB, or window.ethereum.
 */

import { HexAddress, isHexAddress } from './types';
import { APP_CONFIG } from './config';

export type SupportedWalletType = 'metamask' | 'okx' | 'rabby';

export interface WalletMetadata {
  id: SupportedWalletType;
  name: string;
  rdnsPatterns: readonly string[];
  installUrl: string;
  defaultIcon: string;
}

export const ALLOWLISTED_WALLETS: readonly WalletMetadata[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    rdnsPatterns: ['io.metamask', 'io.metamask.flask', 'io.metamask.mmi'],
    installUrl: 'https://metamask.io/download/',
    defaultIcon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Cpath fill="%23E2761B" d="M29.6 2.4l-11.2 8.3 2.1-4.9z"/%3E%3Cpath fill="%23E4761B" d="M2.4 2.4l11.1 8.4-2-5z"/%3E%3Cpath fill="%23D7C1B3" d="M24.8 22.3l-2.9 4.4 6.7 1.8 1.9-6.4zM7.2 22.3l-5.7-.2 1.9 6.4 6.7-1.8z"/%3E%3Cpath fill="%23233447" d="M10.1 28.5L16 25l5.9 3.5-5.9 3.5z"/%3E%3Cpath fill="%23CD6116" d="M16 10.7l-5.9 3.5 1.1 4.7 4.8-1.2 4.8 1.2 1.1-4.7z"/%3E%3C/svg%3E',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    rdnsPatterns: ['com.okx.wallet', 'com.okex.wallet'],
    installUrl: 'https://www.okx.com/web3',
    defaultIcon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" rx="4" fill="%23000"/%3E%3Cpath fill="%23fff" d="M6 6h6v6H6zm14 0h6v6h-6zM6 20h6v6H6zm14 0h6v6h-6zm-7-7h6v6h-6z"/%3E%3C/svg%3E',
  },
  {
    id: 'rabby',
    name: 'Rabby',
    rdnsPatterns: ['io.rabby'],
    installUrl: 'https://rabby.io/',
    defaultIcon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%238697FF"/%3E%3Cpath fill="%23fff" d="M16 6c-5.5 0-10 4.5-10 10 0 3.8 2.1 7.1 5.2 8.8.4-.6.8-1.4 1.2-2.3-2.1-1.3-3.4-3.6-3.4-6.5 0-4 3.1-7 7-7s7 3 7 7c0 2.9-1.3 5.2-3.4 6.5.4.9.8 1.7 1.2 2.3 3.1-1.7 5.2-5 5.2-8.8 0-5.5-4.5-10-10-10z"/%3E%3C/svg%3E',
  },
] as const;

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export interface DiscoveredWalletItem {
  walletType: SupportedWalletType;
  metadata: WalletMetadata;
  detail: EIP6963ProviderDetail | null;
  isAvailable: boolean;
}

export interface WalletSessionState {
  account: HexAddress | null;
  chainId: number | null;
  selectedDetail: EIP6963ProviderDetail | null;
  selectedMetadata: WalletMetadata | null;
  isConnecting: boolean;
  isWrongChain: boolean;
  error: string | null;
}

/**
 * Strictly classifies RDNS string against allowlisted patterns.
 * Never inspects or trusts display name or icon.
 */
export function classifyRDNS(rdns: string): SupportedWalletType | null {
  if (typeof rdns !== 'string' || !rdns.trim()) return null;
  const clean = rdns.trim().toLowerCase();

  for (const meta of ALLOWLISTED_WALLETS) {
    if (meta.rdnsPatterns.includes(clean)) {
      return meta.id;
    }
  }
  return null;
}

/**
 * Validates EIP-6963 provider announcement detail strictly.
 */
export function validateEIP6963Detail(detail: unknown): EIP6963ProviderDetail | null {
  if (!detail || typeof detail !== 'object') return null;
  const d = detail as Record<string, unknown>;

  if (!d.info || typeof d.info !== 'object') return null;
  const info = d.info as Record<string, unknown>;

  if (typeof info.uuid !== 'string' || !info.uuid.trim()) return null;
  if (typeof info.name !== 'string' || !info.name.trim()) return null;
  if (typeof info.rdns !== 'string' || !info.rdns.trim()) return null;

  if (!d.provider || typeof d.provider !== 'object') return null;
  const provider = d.provider as Record<string, unknown>;
  if (typeof provider.request !== 'function') return null;

  const validInfo: EIP6963ProviderInfo = {
    uuid: info.uuid.trim(),
    name: info.name.trim(),
    icon: typeof info.icon === 'string' ? info.icon : '',
    rdns: info.rdns.trim().toLowerCase(),
  };

  return {
    info: validInfo,
    provider: d.provider as EIP1193Provider,
  };
}

/**
 * Parse hex or decimal chain ID representation into safe integer.
 */
export function parseChainId(rawChainId: unknown): number | null {
  if (typeof rawChainId === 'number' && Number.isSafeInteger(rawChainId)) {
    return rawChainId;
  }
  if (typeof rawChainId === 'string') {
    const s = rawChainId.trim();
    if (s.startsWith('0x') || s.startsWith('0X')) {
      const parsed = parseInt(s, 16);
      return Number.isSafeInteger(parsed) ? parsed : null;
    }
    const parsed = parseInt(s, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * EIP-6963 Discovery Service
 */
export class EIP6963DiscoveryService {
  private discoveredByUuid = new Map<string, EIP6963ProviderDetail>();
  private uuidByProvider = new WeakMap<object, string>();
  private listeners = new Set<(wallets: DiscoveredWalletItem[]) => void>();
  private announcementHandler: ((event: Event) => void) | null = null;

  public start(): void {
    if (typeof window === 'undefined') return;

    this.announcementHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const validDetail = validateEIP6963Detail(customEvent.detail);
      if (!validDetail) return;

      const walletType = classifyRDNS(validDetail.info.rdns);
      if (!walletType) {
        // Discard unallowlisted providers
        return;
      }

      // Re-announcements may update metadata only when both identities agree.
      // A UUID collision or the same provider presented under a second UUID is
      // ambiguous and fails closed instead of silently replacing an authority.
      const providerObject = validDetail.provider as object;
      const existingForUuid = this.discoveredByUuid.get(validDetail.info.uuid);
      const existingUuidForProvider = this.uuidByProvider.get(providerObject);
      if (existingForUuid && existingForUuid.provider !== validDetail.provider) return;
      if (existingUuidForProvider && existingUuidForProvider !== validDetail.info.uuid) return;

      this.discoveredByUuid.set(validDetail.info.uuid, validDetail);
      this.uuidByProvider.set(providerObject, validDetail.info.uuid);
      this.notify();
    };

    window.addEventListener('eip6963:announceProvider', this.announcementHandler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  public stop(): void {
    if (typeof window === 'undefined') return;
    if (this.announcementHandler) {
      window.removeEventListener('eip6963:announceProvider', this.announcementHandler);
      this.announcementHandler = null;
    }
    this.discoveredByUuid.clear();
    this.uuidByProvider = new WeakMap<object, string>();
    this.listeners.clear();
  }

  public subscribe(listener: (wallets: DiscoveredWalletItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDiscoveredWallets());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getDiscoveredWallets(): DiscoveredWalletItem[] {
    const items: DiscoveredWalletItem[] = [];

    for (const meta of ALLOWLISTED_WALLETS) {
      // Find all matching discovered providers for this wallet metadata
      const matches: EIP6963ProviderDetail[] = [];
      for (const detail of this.discoveredByUuid.values()) {
        if (classifyRDNS(detail.info.rdns) === meta.id) {
          matches.push(detail);
        }
      }

      if (matches.length === 0) {
        items.push({
          walletType: meta.id,
          metadata: meta,
          detail: null,
          isAvailable: false,
        });
      } else {
        for (const detail of matches) {
          items.push({
            walletType: meta.id,
            metadata: meta,
            detail,
            isAvailable: true,
          });
        }
      }
    }

    return items;
  }

  private notify(): void {
    const list = this.getDiscoveredWallets();
    this.listeners.forEach((listener) => listener(list));
  }
}

/**
 * Hardened In-Memory Wallet Session Controller
 */
export class WalletSessionController {
  private state: WalletSessionState = {
    account: null,
    chainId: null,
    selectedDetail: null,
    selectedMetadata: null,
    isConnecting: false,
    isWrongChain: false,
    error: null,
  };

  private listeners = new Set<(state: WalletSessionState) => void>();

  // Stable named event handler references
  private boundAccountsChanged: (accounts: unknown) => void;
  private boundChainChanged: (chainId: unknown) => void;

  constructor() {
    this.boundAccountsChanged = this.handleAccountsChanged.bind(this);
    this.boundChainChanged = this.handleChainChanged.bind(this);
  }

  public getState(): WalletSessionState {
    return { ...this.state };
  }

  public subscribe(listener: (state: WalletSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async connect(item: DiscoveredWalletItem): Promise<void> {
    if (!item.detail || !item.isAvailable) {
      this.updateState({
        error: `${item.metadata.name} is not installed or available.`,
      });
      return;
    }

    const { detail, metadata } = item;
    const provider = detail.provider;

    // Clean up previous provider listeners if any
    this.detachProviderListeners();

    this.updateState({
      isConnecting: true,
      error: null,
    });

    try {
      // 1. Request accounts from exact provider object
      const accountsResult = await provider.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accountsResult) || accountsResult.length === 0) {
        throw new Error('No accounts authorized by wallet.');
      }

      const rawAccount = accountsResult[0];
      if (!isHexAddress(rawAccount)) {
        throw new Error(`Invalid account address returned: "${String(rawAccount)}"`);
      }
      const account = rawAccount.toLowerCase() as HexAddress;

      // 2. Query chain ID
      let chainId: number | null = null;
      try {
        const rawChain = await provider.request({ method: 'eth_chainId' });
        chainId = parseChainId(rawChain);
      } catch {
        // Fall back gracefully to null if chain query is unsupported
      }

      const isWrongChain = chainId !== null && chainId !== APP_CONFIG.chainId;
      const chainError = isWrongChain
        ? `Connected to unsupported chain (ID: ${chainId}). Please switch to GenLayer Studionet (Chain ID ${APP_CONFIG.chainId}).`
        : null;

      // 3. Attach stable event listeners to exact provider
      this.attachProviderListeners(provider);

      this.updateState({
        account,
        chainId,
        selectedDetail: detail,
        selectedMetadata: metadata,
        isConnecting: false,
        isWrongChain,
        error: chainError,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.detachProviderListeners();
      this.updateState({
        account: null,
        chainId: null,
        selectedDetail: null,
        selectedMetadata: null,
        isConnecting: false,
        isWrongChain: false,
        error: message,
      });
    }
  }

  public disconnect(): void {
    this.detachProviderListeners();
    this.updateState({
      account: null,
      chainId: null,
      selectedDetail: null,
      selectedMetadata: null,
      isConnecting: false,
      isWrongChain: false,
      error: null,
    });
  }

  public destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }

  private attachProviderListeners(provider: EIP1193Provider): void {
    if (typeof provider.on === 'function') {
      provider.on('accountsChanged', this.boundAccountsChanged);
      provider.on('chainChanged', this.boundChainChanged);
    }
  }

  private detachProviderListeners(): void {
    const provider = this.state.selectedDetail?.provider;
    if (provider && typeof provider.removeListener === 'function') {
      provider.removeListener('accountsChanged', this.boundAccountsChanged);
      provider.removeListener('chainChanged', this.boundChainChanged);
    }
  }

  private handleAccountsChanged(rawAccounts: unknown): void {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
      // User locked wallet or removed account permissions
      this.disconnect();
      return;
    }

    const first = rawAccounts[0];
    if (!isHexAddress(first)) {
      this.disconnect();
      return;
    }

    const account = first.toLowerCase() as HexAddress;
    this.updateState({ account, error: null });
  }

  private handleChainChanged(rawChain: unknown): void {
    const chainId = parseChainId(rawChain);
    const isWrongChain = chainId !== null && chainId !== APP_CONFIG.chainId;
    const chainError = isWrongChain
      ? `Connected to unsupported chain (ID: ${chainId}). Please switch to GenLayer Studionet (Chain ID ${APP_CONFIG.chainId}).`
      : null;

    this.updateState({
      chainId,
      isWrongChain,
      error: chainError,
    });
  }

  private updateState(partial: Partial<WalletSessionState>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}
