import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ALLOWLISTED_WALLETS,
  classifyRDNS,
  validateEIP6963Detail,
  parseChainId,
  EIP6963DiscoveryService,
  WalletSessionController,
  EIP6963ProviderDetail,
  EIP1193Provider,
} from '../src/wallet';
import { APP_CONFIG } from '../src/config';

function createMockProvider(overrides?: Partial<EIP1193Provider>): EIP1193Provider {
  return {
    request: vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') {
        return ['0x1234567890abcdef1234567890abcdef12345678'];
      }
      if (method === 'eth_chainId') {
        return `0x${APP_CONFIG.chainId.toString(16)}`;
      }
      return null;
    }),
    on: vi.fn(),
    removeListener: vi.fn(),
    ...overrides,
  };
}

describe('EIP-6963 Multi-Provider Discovery & Hardened Wallet Controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('RDNS Allowlist Enforcement', () => {
    it('classifies MetaMask allowlisted RDNS patterns', () => {
      expect(classifyRDNS('io.metamask')).toBe('metamask');
      expect(classifyRDNS('io.metamask.flask')).toBe('metamask');
      expect(classifyRDNS('io.metamask.mmi')).toBe('metamask');
      expect(classifyRDNS('IO.METAMASK')).toBe('metamask');
    });

    it('classifies OKX Wallet allowlisted RDNS patterns', () => {
      expect(classifyRDNS('com.okx.wallet')).toBe('okx');
      expect(classifyRDNS('com.okex.wallet')).toBe('okx');
    });

    it('classifies Rabby allowlisted RDNS pattern', () => {
      expect(classifyRDNS('io.rabby')).toBe('rabby');
    });

    it('rejects unallowlisted or forged RDNS patterns regardless of name', () => {
      expect(classifyRDNS('com.forged.metamask')).toBeNull();
      expect(classifyRDNS('io.phantom')).toBeNull();
      expect(classifyRDNS('com.coinbase.wallet')).toBeNull();
      expect(classifyRDNS('')).toBeNull();
      expect(classifyRDNS(' ')).toBeNull();
    });

    it('contains exactly 3 allowlisted wallet specifications', () => {
      expect(ALLOWLISTED_WALLETS.length).toBe(3);
      const ids = ALLOWLISTED_WALLETS.map((w) => w.id);
      expect(ids).toEqual(['metamask', 'okx', 'rabby']);
    });
  });

  describe('EIP-6963 Detail Validation', () => {
    it('validates compliant provider announcement', () => {
      const raw = {
        info: {
          uuid: 'uuid-1234',
          name: 'MetaMask',
          icon: 'data:image/svg+xml;base64,icon',
          rdns: 'io.metamask',
        },
        provider: createMockProvider(),
      };

      const validated = validateEIP6963Detail(raw);
      expect(validated).not.toBeNull();
      expect(validated?.info.uuid).toBe('uuid-1234');
      expect(validated?.info.rdns).toBe('io.metamask');
    });

    it('rejects malformed announcement details', () => {
      expect(validateEIP6963Detail(null)).toBeNull();
      expect(validateEIP6963Detail({})).toBeNull();
      expect(validateEIP6963Detail({ info: null })).toBeNull();
      expect(
        validateEIP6963Detail({
          info: { uuid: '', name: 'MetaMask', rdns: 'io.metamask' },
          provider: createMockProvider(),
        }),
      ).toBeNull();
      expect(
        validateEIP6963Detail({
          info: { uuid: '1', name: '', rdns: 'io.metamask' },
          provider: createMockProvider(),
        }),
      ).toBeNull();
      expect(
        validateEIP6963Detail({
          info: { uuid: '1', name: 'MetaMask', rdns: '' },
          provider: createMockProvider(),
        }),
      ).toBeNull();
      expect(
        validateEIP6963Detail({
          info: { uuid: '1', name: 'MetaMask', rdns: 'io.metamask' },
          provider: null,
        }),
      ).toBeNull();
    });
  });

  describe('Chain ID Parser', () => {
    it('parses hex string, decimal string, and number chain IDs', () => {
      expect(parseChainId('0xf22f')).toBe(61999);
      expect(parseChainId('0XF22F')).toBe(61999);
      expect(parseChainId('61999')).toBe(61999);
      expect(parseChainId(61999)).toBe(61999);
      expect(parseChainId(1)).toBe(1);
    });

    it('returns null on invalid chain ID representations', () => {
      expect(parseChainId('')).toBeNull();
      expect(parseChainId('invalid')).toBeNull();
      expect(parseChainId(null)).toBeNull();
      expect(parseChainId(undefined)).toBeNull();
    });
  });

  describe('EIP6963DiscoveryService', () => {
    it('discovers allowlisted providers and deduplicates by UUID', () => {
      const service = new EIP6963DiscoveryService();
      service.start();

      const detailMeta: EIP6963ProviderDetail = {
        info: {
          uuid: 'uuid-metamask-1',
          name: 'MetaMask',
          icon: 'data:image/svg+xml;base64,meta',
          rdns: 'io.metamask',
        },
        provider: createMockProvider(),
      };

      const detailForged: EIP6963ProviderDetail = {
        info: {
          uuid: 'uuid-forged-1',
          name: 'MetaMask', // Forged name
          icon: 'data:image/svg+xml;base64,meta',
          rdns: 'com.phish.metamask', // Not allowlisted
        },
        provider: createMockProvider(),
      };

      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', { detail: detailMeta }),
      );
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', { detail: detailForged }),
      );

      const wallets = service.getDiscoveredWallets();
      const metaItem = wallets.find((w) => w.walletType === 'metamask' && w.isAvailable);
      expect(metaItem).toBeDefined();
      expect(metaItem?.detail?.info.uuid).toBe('uuid-metamask-1');

      // Forged RDNS must not appear as available
      const unallowlisted = wallets.find((w) => w.detail?.info.rdns === 'com.phish.metamask');
      expect(unallowlisted).toBeUndefined();

      service.stop();
    });

    it('fails closed on UUID and provider-identity collisions', () => {
      const service = new EIP6963DiscoveryService();
      service.start();
      const firstProvider = createMockProvider();
      const collidingProvider = createMockProvider();

      const announce = (uuid: string, provider: EIP1193Provider) =>
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
          detail: {
            info: { uuid, name: 'MetaMask', icon: '', rdns: 'io.metamask' },
            provider,
          },
        }));

      announce('stable-uuid', firstProvider);
      announce('stable-uuid', collidingProvider);
      announce('different-uuid', firstProvider);

      const available = service.getDiscoveredWallets().filter((item) => item.isAvailable);
      expect(available).toHaveLength(1);
      expect(available[0].detail?.provider).toBe(firstProvider);
      expect(available[0].detail?.info.uuid).toBe('stable-uuid');
      service.stop();
    });
  });

  describe('WalletSessionController Lifecycle & Listener Management', () => {
    it('connects to exact provider instance and attaches stable listeners', async () => {
      const controller = new WalletSessionController();
      const mockProvider = createMockProvider();

      const walletItem = {
        walletType: 'metamask' as const,
        metadata: ALLOWLISTED_WALLETS[0],
        detail: {
          info: {
            uuid: 'uuid-1',
            name: 'MetaMask',
            icon: '',
            rdns: 'io.metamask',
          },
          provider: mockProvider,
        },
        isAvailable: true,
      };

      await controller.connect(walletItem);
      const state = controller.getState();

      expect(state.account).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(state.chainId).toBe(APP_CONFIG.chainId);
      expect(state.isWrongChain).toBe(false);
      expect(state.error).toBeNull();
      expect(mockProvider.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockProvider.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    });

    it('cleanly detaches listeners on disconnect', async () => {
      const controller = new WalletSessionController();
      const mockProvider = createMockProvider();

      const walletItem = {
        walletType: 'metamask' as const,
        metadata: ALLOWLISTED_WALLETS[0],
        detail: {
          info: { uuid: 'uuid-1', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: mockProvider,
        },
        isAvailable: true,
      };

      await controller.connect(walletItem);
      controller.disconnect();

      expect(mockProvider.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockProvider.removeListener).toHaveBeenCalledWith('chainChanged', expect.any(Function));

      const state = controller.getState();
      expect(state.account).toBeNull();
      expect(state.selectedDetail).toBeNull();
    });

    it('disconnects when account list becomes empty (lock/removal)', async () => {
      let accountsListener: ((accs: unknown) => void) | undefined;
      const mockProvider = createMockProvider({
        on: vi.fn((event, handler) => {
          if (event === 'accountsChanged') {
            accountsListener = handler as (accs: unknown) => void;
          }
        }),
      });

      const controller = new WalletSessionController();
      await controller.connect({
        walletType: 'metamask',
        metadata: ALLOWLISTED_WALLETS[0],
        detail: {
          info: { uuid: 'u1', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: mockProvider,
        },
        isAvailable: true,
      });

      expect(controller.getState().account).not.toBeNull();

      // Trigger accountsChanged with empty array
      accountsListener?.([]);
      expect(controller.getState().account).toBeNull();
    });

    it('sets isWrongChain when connected to unsupported network', async () => {
      const mockProvider = createMockProvider({
        request: vi.fn().mockImplementation(async ({ method }) => {
          if (method === 'eth_requestAccounts') return ['0x1234567890abcdef1234567890abcdef12345678'];
          if (method === 'eth_chainId') return '0x1'; // Mainnet (1) instead of Studionet (61999)
          return null;
        }),
      });

      const controller = new WalletSessionController();
      await controller.connect({
        walletType: 'okx',
        metadata: ALLOWLISTED_WALLETS[1],
        detail: {
          info: { uuid: 'okx-1', name: 'OKX Wallet', icon: '', rdns: 'com.okx.wallet' },
          provider: mockProvider,
        },
        isAvailable: true,
      });

      const state = controller.getState();
      expect(state.isWrongChain).toBe(true);
      expect(state.error).toContain('Connected to unsupported chain');
    });
  });
});
