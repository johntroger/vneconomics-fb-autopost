import { encodeFunctionData } from 'viem';
import {
  BASE_SEPOLIA_CHAIN_ID_HEX,
  KNOWN_MAINNET_CHAIN_IDS,
  NETWORK_METADATA,
  SUPPORTED_TESTNET_CHAIN_IDS,
  VNE_CERTIFICATE_NFT_ABI,
  VNE_CONTRACT_ADDRESSES,
} from './contractsAbi.ts';
import type { UserNft } from '../../core/types/index.ts';
import { getLanguage } from '../../core/i18n/i18nService.ts';

const isEnLang = () => getLanguage() === 'en';

interface Eip1193Provider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
  isBraveWallet?: boolean;
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
}

interface Cip30Api {
  getNetworkId: () => Promise<number>;
  getUsedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  signData?: (addr: string, payloadHex: string) => Promise<{ signature: string; key: string }>;
}

interface CardanoWalletProvider {
  name?: string;
  icon?: string;
  enable: () => Promise<Cip30Api>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
    cardano?: Record<string, CardanoWalletProvider>;
  }
}

export interface EvmWalletState {
  connected: boolean;
  address: string;
  chainId: string;
  networkName: string;
  walletName: string;
  isTestnet: boolean;
  isMainnetDanger: boolean;
}

export interface CardanoWalletState {
  connected: boolean;
  walletId: string;
  addressHex: string;
  networkId: number; // 0 = Testnet (Preprod/Preview), 1 = Mainnet
  isTestnet: boolean;
  isMainnetDanger: boolean;
}

const KEY_MINTED_NFTS = 'vne_minted_nfts';

export async function computeSha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function connectEvmTestnetWallet(): Promise<EvmWalletState> {
  const en = isEnLang();
  const eth = window.ethereum;
  if (!eth) {
    throw new Error(
      en
        ? 'No EVM wallet detected (MetaMask, Rabby, OKX, Coinbase Wallet).'
        : 'Không phát hiện ví EVM (MetaMask, Rabby, OKX, Coinbase Wallet).',
    );
  }

  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error(en ? 'Could not retrieve EVM wallet address.' : 'Không lấy được địa chỉ ví EVM.');

  const chainId = String(await eth.request({ method: 'eth_chainId' })).toLowerCase();
  const isMainnetDanger = KNOWN_MAINNET_CHAIN_IDS.includes(chainId);
  const isTestnet = SUPPORTED_TESTNET_CHAIN_IDS.includes(chainId);

  const walletName = eth.isRabby
    ? 'Rabby Wallet'
    : eth.isOkxWallet
      ? 'OKX Wallet'
      : eth.isCoinbaseWallet
        ? 'Coinbase Wallet'
        : eth.isMetaMask
          ? 'MetaMask'
          : 'EVM Wallet';

  return {
    connected: true,
    address,
    chainId,
    networkName:
      NETWORK_METADATA[chainId]?.name ||
      (isMainnetDanger ? (en ? 'MAINNET (BLOCKED)' : 'MAINNET (CHẶN GIAO DỊCH)') : `Chain ${chainId}`),
    walletName,
    isTestnet,
    isMainnetDanger,
  };
}

export async function switchToBaseSepolia(): Promise<void> {
  const eth = window.ethereum;
  if (!eth) throw new Error(isEnLang() ? 'No EVM wallet found.' : 'Chưa có ví EVM.');
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code: number }).code : 0;
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Base Sepolia Testnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function detectCardanoWallets(): string[] {
  if (typeof window === 'undefined' || !window.cardano) return [];
  const preferred = ['eternl', 'lace', 'vespr', 'nami', 'typhon', 'yoroi'];
  return preferred.filter((id) => Boolean(window.cardano?.[id]?.enable));
}

export async function connectCardanoWallet(walletId: string): Promise<CardanoWalletState> {
  const en = isEnLang();
  const provider = window.cardano?.[walletId];
  if (!provider) {
    throw new Error(
      en
        ? `Cardano wallet (${walletId}) not found. Please install Eternl, Lace, or Vespr.`
        : `Không tìm thấy ví Cardano (${walletId}). Hãy cài Eternl, Lace hoặc Vespr.`,
    );
  }
  const api = await provider.enable();
  const networkId = await api.getNetworkId();
  const used = await api.getUsedAddresses();
  const addressHex = used?.[0] || (await api.getChangeAddress());

  return {
    connected: true,
    walletId,
    addressHex,
    networkId,
    isTestnet: networkId === 0,
    isMainnetDanger: networkId === 1,
  };
}

export function getMintedNfts(): UserNft[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_MINTED_NFTS) || '[]') as UserNft[];
  } catch {
    return [];
  }
}

export function getNftByVerifyCode(code: string): UserNft | undefined {
  return getMintedNfts().find((n) => n.verifyCode.toLowerCase() === code.toLowerCase());
}

export async function mintTestnetNft(params: {
  nftType: 'passport' | 'certificate' | 'proof';
  title: string;
  milestoneStage: number;
  chainFamily: 'evm' | 'cardano';
  evmState?: EvmWalletState | null;
  cardanoState?: CardanoWalletState | null;
}): Promise<UserNft> {
  const en = isEnLang();
  if (params.chainFamily === 'evm') {
    if (!params.evmState?.connected) {
      throw new Error(en ? 'Please connect an EVM Testnet wallet first.' : 'Vui lòng kết nối ví EVM Testnet trước.');
    }
    if (params.evmState.isMainnetDanger || !params.evmState.isTestnet) {
      throw new Error(
        en
          ? 'TESTNET SAFETY: Switch to Base Sepolia or Ethereum Sepolia (Mainnet is blocked).'
          : 'AN TOÀN TESTNET: Vui lòng chuyển sang Base Sepolia hoặc Ethereum Sepolia (chặn Mainnet).',
      );
    }
  } else {
    if (!params.cardanoState?.connected) {
      throw new Error(
        en ? 'Please connect a Cardano (CIP-30) wallet first.' : 'Vui lòng kết nối ví Cardano (CIP-30) trước.',
      );
    }
    if (params.cardanoState.isMainnetDanger) {
      throw new Error(
        en
          ? 'TESTNET SAFETY: Cardano wallet is on Mainnet. Please switch to Preprod/Preview Testnet.'
          : 'AN TOÀN TESTNET: Ví Cardano đang ở Mainnet. Vui lòng chuyển sang Preprod/Preview Testnet.',
      );
    }
  }

  const verifyCode = `VNE-${params.nftType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const sha256Proof = await computeSha256Hex(`${verifyCode}|${params.title}|${params.milestoneStage}`);
  const metadataUri = `https://vneconomics.com/api/nft_metadata.php?code=${encodeURIComponent(verifyCode)}`;

  let txHash = `0x${sha256Proof.slice(0, 64)}`;
  const tokenId = String(Math.floor(1000 + Math.random() * 8999));

  // Nếu đã cấu hình Contract Address thật trên Testnet, thực hiện gửi giao dịch on-chain qua EIP-1193
  if (params.chainFamily === 'evm' && params.evmState && window.ethereum) {
    const contractAddr = VNE_CONTRACT_ADDRESSES[params.evmState.chainId]?.nft;
    if (contractAddr && contractAddr.startsWith('0x')) {
      const data = encodeFunctionData({
        abi: VNE_CERTIFICATE_NFT_ABI,
        functionName: 'mintCertificate',
        args: [
          params.evmState.address as `0x${string}`,
          params.nftType,
          params.title,
          params.milestoneStage,
          sha256Proof,
          metadataUri,
        ],
      });
      txHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: params.evmState.address, to: contractAddr, data }],
      })) as string;
    }
  }

  const record: UserNft = {
    verifyCode,
    nftType: params.nftType,
    title: params.title,
    chainFamily: params.chainFamily,
    network:
      params.chainFamily === 'evm'
        ? params.evmState?.networkName || 'Base Sepolia Testnet'
        : `Cardano Preprod Testnet (${params.cardanoState?.walletId})`,
    tokenId,
    txHash,
    sha256Proof,
    mintedAt: new Date().toISOString(),
  };

  const list = getMintedNfts();
  list.unshift(record);
  try {
    localStorage.setItem(KEY_MINTED_NFTS, JSON.stringify(list));
  } catch {
    // Ignore
  }

  return record;
}

export interface OnChainTestnetProof {
  chainFamily: 'evm' | 'cardano';
  network: string;
  txHash: string;
  explorerUrl: string;
}

function toUtf8Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function executeEvmTestnetOnChainAction(params: {
  evm: EvmWalletState;
  toAddress: string;
  actionTag: string;
  valueWeiHex?: string;
}): Promise<OnChainTestnetProof> {
  const en = isEnLang();
  if (!params.evm.connected || !window.ethereum) {
    throw new Error(
      en
        ? 'Please connect an EVM Testnet wallet (MetaMask / Rabby) first.'
        : 'Vui lòng kết nối ví EVM Testnet (MetaMask / Rabby) trước.',
    );
  }
  if (params.evm.isMainnetDanger || !params.evm.isTestnet) {
    throw new Error(
      en
        ? 'TESTNET ONLY: Mainnet is blocked! Please switch your wallet to Base Sepolia or Ethereum Sepolia.'
        : 'CHỈ DÙNG TESTNET: Đã chặn mạng Mainnet! Vui lòng chuyển ví sang Base Sepolia hoặc Ethereum Sepolia.',
    );
  }

  const dataHex = `0x${toUtf8Hex(`VNE:${params.actionTag}:${Date.now()}`)}`;
  const txHash = (await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: params.evm.address,
        to: params.toAddress,
        value: params.valueWeiHex ?? '0x0',
        data: dataHex,
      },
    ],
  })) as string;

  const explorerTxPrefix = NETWORK_METADATA[params.evm.chainId]?.explorerTxUrl || 'https://sepolia.basescan.org/tx/';
  return {
    chainFamily: 'evm',
    network: params.evm.networkName,
    txHash,
    explorerUrl: `${explorerTxPrefix}${txHash}`,
  };
}

export async function executeCardanoTestnetOnChainAction(params: {
  cardano: CardanoWalletState;
  actionTag: string;
  submittedTxHash?: string;
}): Promise<OnChainTestnetProof> {
  const en = isEnLang();
  if (!params.cardano.connected) {
    throw new Error(
      en
        ? 'Please connect a Cardano Preprod Testnet wallet (Lace / Eternl / Vespr) first.'
        : 'Vui lòng kết nối ví Cardano Preprod Testnet (Lace / Eternl / Vespr) trước.',
    );
  }
  if (params.cardano.isMainnetDanger || !params.cardano.isTestnet) {
    throw new Error(
      en
        ? 'TESTNET ONLY: Cardano Mainnet is blocked! Please switch your wallet to Preprod Testnet.'
        : 'CHỈ DÙNG TESTNET: Đã chặn Cardano Mainnet! Vui lòng chuyển ví sang Preprod Testnet.',
    );
  }

  const cleanTx = params.submittedTxHash?.trim() || '';
  if (cleanTx.length >= 32) {
    return {
      chainFamily: 'cardano',
      network: `Cardano Preprod (${params.cardano.walletId})`,
      txHash: cleanTx,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${cleanTx}`,
    };
  }

  const provider = window.cardano?.[params.cardano.walletId];
  if (!provider) {
    throw new Error(en ? 'Cardano wallet provider unavailable.' : 'Không tìm thấy ví Cardano.');
  }
  const api = await provider.enable();
  const payloadHex = toUtf8Hex(`VNE:${params.actionTag}:${Date.now()}`);
  if (typeof api.signData === 'function') {
    const signed = await api.signData(params.cardano.addressHex, payloadHex);
    const proofHash = await computeSha256Hex(`${signed.signature}|${payloadHex}`);
    return {
      chainFamily: 'cardano',
      network: `Cardano Preprod (${params.cardano.walletId})`,
      txHash: proofHash,
      explorerUrl: 'https://preprod.cardanoscan.io/',
    };
  }

  throw new Error(
    en
      ? 'This Cardano wallet does not support CIP-8 signData. Please paste your Preprod txHash.'
      : 'Ví Cardano này chưa hỗ trợ ký CIP-8. Vui lòng dán mã txHash Preprod Testnet.',
  );
}
