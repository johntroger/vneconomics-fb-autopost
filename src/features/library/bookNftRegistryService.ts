import { encodeFunctionData } from 'viem';
import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getSavedProfile } from '../account/accountService.ts';
import { awardPracticePoints } from '../game/vneGameService.ts';
import {
  computeSha256Hex,
  connectCardanoWallet,
  connectEvmTestnetWallet,
  type CardanoWalletState,
  type EvmWalletState,
} from '../web3/multiChainWalletService.ts';
import { VNE_CERTIFICATE_NFT_ABI, VNE_CONTRACT_ADDRESSES } from '../web3/contractsAbi.ts';

export const BOOK_NFTS_UPDATED_EVENT = 'vne:book-nfts-updated';
const KEY_BOOK_NFT_REGISTRY = 'vne_book_nft_registry_v1';

export interface BookNftRecord {
  book_key: string;
  book_slug: string;
  book_title: string;
  cover_image?: string;
  verify_code: string;
  token_id: string;
  owner_address: string;
  owner_name: string;
  creator_wallet: string;
  chain_family: 'evm' | 'cardano' | 'sandbox';
  network: string;
  contract_address: string;
  tx_hash: string;
  sha256_proof: string;
  minted_at: string;
  is_onchain: boolean;
  status: 'ACTIVE_ORIGINAL';
}

const isEnLang = () => getLanguage() === 'en';

export function normalizeBookKey(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeReadRegistry(): BookNftRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY_BOOK_NFT_REGISTRY);
    const parsed = raw ? (JSON.parse(raw) as BookNftRecord[]) : [];
    return Array.isArray(parsed) ? deduplicateBookNfts(parsed) : [];
  } catch {
    return [];
  }
}

function safeWriteRegistry(items: BookNftRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_BOOK_NFT_REGISTRY, JSON.stringify(deduplicateBookNfts(items)));
    window.dispatchEvent(new CustomEvent(BOOK_NFTS_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Write-Once Immutability (modeled after yeutrongcay/plantPassportRegistryService.ts):
 * Earliest minted ACTIVE_ORIGINAL record per book_key always wins and cannot be overwritten.
 */
export function deduplicateBookNfts(items: BookNftRecord[]): BookNftRecord[] {
  const sorted = [...items].sort((a, b) => Date.parse(a.minted_at) - Date.parse(b.minted_at));
  const map = new Map<string, BookNftRecord>();
  for (const item of sorted) {
    const key = normalizeBookKey(item.book_key || item.book_slug);
    if (!key || item.status !== 'ACTIVE_ORIGINAL') continue;
    if (!map.has(key)) {
      map.set(key, { ...item, book_key: key });
    }
  }
  return Array.from(map.values());
}

export function getAllBookNfts(): BookNftRecord[] {
  return safeReadRegistry();
}

export function getBookNftBySlug(slug: string): BookNftRecord | undefined {
  const key = normalizeBookKey(slug);
  return safeReadRegistry().find((b) => b.book_key === key && b.status === 'ACTIVE_ORIGINAL');
}

export function getBookNftByVerifyCode(code: string): BookNftRecord | undefined {
  const clean = code.trim().toLowerCase();
  if (!clean) return undefined;
  return safeReadRegistry().find((b) => b.verify_code.toLowerCase() === clean);
}

export async function syncBookNftsFromServer(): Promise<BookNftRecord[]> {
  const local = safeReadRegistry();
  try {
    const res = await fetch('/api/book_nfts.php', { cache: 'no-store' });
    if (!res.ok) return local;
    const json = (await res.json()) as { ok?: boolean; data?: { books?: BookNftRecord[] } };
    const remote = json?.data?.books || [];
    if (Array.isArray(remote) && remote.length > 0) {
      const merged = deduplicateBookNfts([...remote, ...local]);
      safeWriteRegistry(merged);
      return merged;
    }
  } catch {
    // Offline or Vite local mode without PHP backend
  }
  return local;
}

export function formatShortWallet(addr: string): string {
  if (!addr || addr.length < 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function mintExclusiveBookNft(params: {
  bookSlug: string;
  bookTitle: string;
  coverImage?: string;
  mode: 'evm' | 'cardano' | 'sandbox';
  cardanoWalletId?: string;
  customOwnerName?: string;
}): Promise<{ ok: boolean; message: string; record?: BookNftRecord; existingOwner?: BookNftRecord }> {
  const en = isEnLang();
  const bookKey = normalizeBookKey(params.bookSlug);

  // 1. Strict First-to-Mint Exclusivity Check (Local + Server)
  const localExisting = getBookNftBySlug(bookKey);
  if (localExisting) {
    return {
      ok: false,
      existingOwner: localExisting,
      message: en
        ? `This book is already exclusively owned by ${localExisting.owner_name} (${formatShortWallet(localExisting.owner_address)}).`
        : `Sách này đã thuộc sở hữu Độc bản của ${localExisting.owner_name} (${formatShortWallet(localExisting.owner_address)}).`,
    };
  }

  const profile = getSavedProfile();
  const ownerName = params.customOwnerName?.trim() || profile?.displayName || (en ? 'VNEconomics Pioneer' : 'Độc giả Tiên phong VNE');

  let evmState: EvmWalletState | null = null;
  let cardanoState: CardanoWalletState | null = null;
  let ownerAddress = '';
  let network = 'VNEconomics Testnet Sandbox ($0)';
  let contractAddress = '0xVNE-BOOK-1OF1-SANDBOX';
  let isOnchain = false;

  if (params.mode === 'evm') {
    evmState = await connectEvmTestnetWallet();
    if (evmState.isMainnetDanger || !evmState.isTestnet) {
      return {
        ok: false,
        message: en
          ? 'TESTNET SAFETY: Please switch your EVM wallet to Base Sepolia or Ethereum Sepolia (Mainnet is blocked).'
          : 'AN TOÀN TESTNET: Vui lòng chuyển ví EVM sang Base Sepolia hoặc Ethereum Sepolia (chặn Mainnet).',
      };
    }
    ownerAddress = evmState.address;
    network = evmState.networkName;
    contractAddress = VNE_CONTRACT_ADDRESSES[evmState.chainId]?.nft || contractAddress;
  } else if (params.mode === 'cardano') {
    const walletId = params.cardanoWalletId || 'eternl';
    cardanoState = await connectCardanoWallet(walletId);
    if (cardanoState.isMainnetDanger) {
      return {
        ok: false,
        message: en
          ? 'TESTNET SAFETY: Cardano wallet is on Mainnet. Switch to Preprod Testnet.'
          : 'AN TOÀN TESTNET: Ví Cardano đang ở Mainnet. Vui lòng chuyển sang Preprod Testnet.',
      };
    }
    ownerAddress = cardanoState.addressHex;
    network = `Cardano Preprod Testnet (${walletId.toUpperCase()})`;
    contractAddress = `cardano-cip25-preprod-${walletId}`;
  } else {
    const seed = await computeSha256Hex(`${ownerName}|${profile?.uid || 'guest'}|vne-sandbox`);
    ownerAddress = `0x${seed.slice(0, 40)}`;
  }

  const mintedAt = new Date().toISOString();
  const verifyCode = `VNE-BOOK-${Date.now().toString(36).toUpperCase()}`;
  const sha256Proof = await computeSha256Hex(`vne-book-1of1|${bookKey}|${ownerAddress}|${mintedAt}`);
  const metadataUri = `https://vneconomics.com/api/nft_metadata.php?code=${encodeURIComponent(verifyCode)}`;

  let txHash = `0x${sha256Proof.slice(0, 64)}`;
  const existingCount = getAllBookNfts().length;
  const tokenId = String(existingCount + 1);

  if (params.mode === 'evm' && evmState && window.ethereum && VNE_CONTRACT_ADDRESSES[evmState.chainId]?.nft?.startsWith('0x')) {
    const realContract = VNE_CONTRACT_ADDRESSES[evmState.chainId].nft;
    const data = encodeFunctionData({
      abi: VNE_CERTIFICATE_NFT_ABI,
      functionName: 'claimBookNFT',
      args: [
        evmState.address as `0x${string}`,
        bookKey,
        params.bookTitle,
        sha256Proof,
        metadataUri,
      ],
    });
    txHash = (await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: evmState.address, to: realContract, data }],
    })) as string;
    contractAddress = realContract;
    isOnchain = true;
  }

  const record: BookNftRecord = {
    book_key: bookKey,
    book_slug: params.bookSlug,
    book_title: params.bookTitle,
    cover_image: params.coverImage,
    verify_code: verifyCode,
    token_id: tokenId,
    owner_address: ownerAddress,
    owner_name: ownerName,
    creator_wallet: ownerAddress,
    chain_family: params.mode,
    network,
    contract_address: contractAddress,
    tx_hash: txHash,
    sha256_proof: sha256Proof,
    minted_at: mintedAt,
    is_onchain: isOnchain,
    status: 'ACTIVE_ORIGINAL',
  };

  // Optional remote server atomic check (Write-Once 409 guard)
  try {
    const res = await fetch('/api/book_nfts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim_book', book: record }),
    });
    if (res.status === 409) {
      await syncBookNftsFromServer();
      const winner = getBookNftBySlug(bookKey);
      return {
        ok: false,
        existingOwner: winner,
        message: en
          ? 'Another reader just claimed this Book NFT moments ago! First-to-mint ownership applies.'
          : 'Một độc giả khác vừa đúc NFT sách này trước bạn! Nguyên tắc ai đúc trước sở hữu trước.',
      };
    }
  } catch {
    // Local Vite dev server without PHP backend continues cleanly
  }

  const current = safeReadRegistry();
  safeWriteRegistry([...current, record]);
  awardPracticePoints(15, en ? `Claimed 1-of-1 Book NFT: ${params.bookTitle}` : `Sở hữu NFT Sách Độc bản: ${params.bookTitle}`);

  return {
    ok: true,
    record,
    message: en
      ? `Congratulations! You are the first & exclusive NFT owner of "${params.bookTitle}" (+15 VNE Points).`
      : `Chúc mừng! Bạn là chủ sở hữu NFT Độc bản đầu tiên của cuốn "${params.bookTitle}" (+15 VNE Points).`,
  };
}
