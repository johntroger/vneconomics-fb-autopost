import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, CheckCircle2, ExternalLink, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import {
  connectCardanoWallet,
  connectEvmTestnetWallet,
  detectCardanoWallets,
  getMintedNfts,
  mintTestnetNft,
  switchToBaseSepolia,
  type CardanoWalletState,
  type EvmWalletState,
} from './multiChainWalletService.ts';
import { getPointsState } from '../game/vneGameService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';

export const CardanoHubPage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Cardano Hub, Multi-chain Testnet Wallet & Mint NFT ($0) | VNEconomics'
      : 'Cardano Hub, Ví Multi-chain Testnet & Đúc NFT (0đ) | VNEconomics',
    description: isEn
      ? 'Connect EVM Testnet wallets (MetaMask, Rabby, OKX) & Cardano CIP-30 (Eternl, Lace, Vespr), dRep Governance, and mint free ($0) Digital Passport / Certificate NFTs.'
      : 'Kết nối ví EVM Testnet (MetaMask, Rabby, OKX) & Cardano CIP-30 (Eternl, Lace, Vespr), dRep Governance và đúc NFT Hộ chiếu/Chứng chỉ 0đ tiền thật.',
    canonicalPath: '/cardano-hub/',
  });

  const [evm, setEvm] = useState<EvmWalletState | null>(null);
  const [cardano, setCardano] = useState<CardanoWalletState | null>(null);
  const [cardanoWallets] = useState<string[]>(() => detectCardanoWallets());
  const [nfts, setNfts] = useState(() => getMintedNfts());

  const [nftType, setNftType] = useState<'passport' | 'certificate' | 'proof'>('passport');
  const [nftTitle, setNftTitle] = useState(
    isEn ? 'VNEconomics Digital Economy Passport' : 'Hộ chiếu Kinh tế số VNEconomics',
  );
  const [chainFamily, setChainFamily] = useState<'evm' | 'cardano'>('evm');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [minting, setMinting] = useState(false);

  const points = getPointsState();

  const handleConnectEvm = async () => {
    try {
      const state = await connectEvmTestnetWallet();
      setEvm(state);
      setStatusMsg({
        ok: !state.isMainnetDanger,
        text: state.isMainnetDanger
          ? isEn
            ? 'WARNING: You are connected to Mainnet! Switch to Base Sepolia Testnet below.'
            : 'CẢNH BÁO: Bạn đang ở Mainnet! Hãy bấm nút chuyển sang Base Sepolia Testnet.'
          : isEn
            ? `Connected ${state.walletName} (${state.networkName}).`
            : `Đã kết nối ${state.walletName} (${state.networkName}).`,
      });
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : isEn ? 'EVM wallet connection failed.' : 'Lỗi kết nối ví EVM.',
      });
    }
  };

  const handleConnectCardano = async (walletId: string) => {
    try {
      const state = await connectCardanoWallet(walletId);
      setCardano(state);
      setStatusMsg({
        ok: state.isTestnet,
        text: state.isMainnetDanger
          ? isEn
            ? 'WARNING: Cardano wallet is on Mainnet. Please switch to Preprod Testnet.'
            : 'CẢNH BÁO: Ví Cardano đang ở Mainnet. Vui lòng chuyển sang Preprod Testnet.'
          : isEn
            ? `Connected Cardano ${walletId.toUpperCase()} wallet (Preprod Testnet).`
            : `Đã kết nối ví Cardano ${walletId.toUpperCase()} (Preprod Testnet).`,
      });
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : isEn ? 'Cardano wallet connection failed.' : 'Lỗi kết nối ví Cardano.',
      });
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMinting(true);
    try {
      const minted = await mintTestnetNft({
        nftType,
        title: nftTitle,
        milestoneStage: points.tierLevel,
        chainFamily,
        evmState: evm,
        cardanoState: cardano,
      });
      setNfts(getMintedNfts());
      setStatusMsg({
        ok: true,
        text: isEn
          ? `Testnet NFT minted successfully! Verification code: ${minted.verifyCode}`
          : `Đúc NFT Testnet thành công! Mã xác thực: ${minted.verifyCode}`,
      });
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : isEn ? 'Unable to mint NFT.' : 'Không thể đúc NFT.',
      });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-editorial-navy/10 text-editorial-navy dark:bg-sky-500/15 dark:text-sky-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          {isEn
            ? '100% Multi-chain Testnet ($0 Real Money — Auto-Blocks Mainnet)'
            : 'Multi-chain 100% Testnet (0đ Tiền Thật — Tự động chặn Mainnet)'}
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
          {isEn ? 'Cardano & Web3 Hub • Testnet NFT Mint Studio' : 'Cardano & Web3 Vietnam Hub • Studio Đúc NFT Testnet'}
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400 max-w-3xl">
          {isEn ? (
            <>
              Connect <strong>EVM</strong> (MetaMask, Rabby, OKX) and <strong>Cardano CIP-30</strong> (Eternl, Lace, Vespr) wallets simultaneously to mint Digital Economy Passports, Course Certificates &amp; SHA-256 Academic Proofs.
            </>
          ) : (
            <>
              Kết nối đồng thời ví <strong>EVM</strong> (MetaMask, Rabby, OKX) và ví <strong>Cardano CIP-30</strong> (Eternl, Lace, Vespr) để đúc NFT Hộ chiếu Kinh tế số, Chứng chỉ Khóa học &amp; Bằng chứng Nghiên cứu SHA-256.
            </>
          )}
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            statusMsg.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
          }`}
        >
          {statusMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>{isEn ? 'Reminder:' : 'Lưu ý:'}</strong>{' '}
          {isEn
            ? 'Please connect or switch your wallet to a Testnet network (Base Sepolia, Ethereum Sepolia, Polygon Amoy, or Cardano Preprod Testnet) before minting. Mainnet transactions are automatically blocked.'
            : 'Vui lòng kết nối hoặc chuyển ví của bạn sang mạng Testnet (Base Sepolia, Ethereum Sepolia, Polygon Amoy hoặc Cardano Preprod Testnet) trước khi thao tác. Hệ thống tự động chặn Mainnet để đảm bảo 0đ tiền thật.'}
        </span>
      </div>

      {/* Multi-chain Wallet Connection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EVM Testnet */}
        <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-editorial-teal" />
              {isEn ? 'EVM Testnet Wallet (EIP-1193)' : 'Ví EVM Testnet (EIP-1193)'}
            </h2>
            <span className="text-[11px] font-mono text-ink-500">Base / ETH Sepolia</span>
          </div>

          {evm?.connected ? (
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-300 dark:border-ink-800 space-y-2 text-xs">
              <div><strong>{isEn ? 'Wallet:' : 'Ví:'}</strong> {evm.walletName}</div>
              <div className="font-mono break-all"><strong>{isEn ? 'Address:' : 'Địa chỉ:'}</strong> {evm.address}</div>
              <div><strong>{isEn ? 'Network:' : 'Mạng:'}</strong> {evm.networkName}</div>
              {evm.isMainnetDanger && (
                <button
                  type="button"
                  onClick={async () => {
                    await switchToBaseSepolia();
                    await handleConnectEvm();
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold"
                >
                  {isEn ? 'Switch to Base Sepolia Testnet' : 'Chuyển ngay sang Base Sepolia Testnet'}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectEvm}
              className="px-4 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold transition-colors"
            >
              {isEn ? 'Connect MetaMask / Rabby / OKX' : 'Kết nối MetaMask / Rabby / OKX'}
            </button>
          )}
        </section>

        {/* Cardano CIP-30 Testnet */}
        <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-editorial-navy dark:text-sky-400" />
              {isEn ? 'Cardano Wallet (CIP-30)' : 'Ví Cardano (Chuẩn CIP-30)'}
            </h2>
            <span className="text-[11px] font-mono text-ink-500">Preprod / Preview Testnet</span>
          </div>

          {cardano?.connected ? (
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-300 dark:border-ink-800 space-y-2 text-xs">
              <div><strong>{isEn ? 'Wallet:' : 'Ví:'}</strong> {cardano.walletId.toUpperCase()}</div>
              <div className="font-mono break-all"><strong>Address (Hex):</strong> {cardano.addressHex.slice(0, 42)}...</div>
              <div>
                <strong>Network ID:</strong>{' '}
                {cardano.networkId === 0
                  ? isEn
                    ? '0 (Safe Testnet)'
                    : '0 (Testnet An toàn)'
                  : isEn
                    ? '1 (Mainnet — Please switch to Preprod)'
                    : '1 (Mainnet — Vui lòng chuyển Preprod)'}
              </div>
            </div>
          ) : cardanoWallets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cardanoWallets.map((wid) => (
                <button
                  key={wid}
                  type="button"
                  onClick={() => handleConnectCardano(wid)}
                  className="px-4 py-2 rounded-xl bg-editorial-navy text-white text-xs font-semibold uppercase"
                >
                  {isEn ? `Connect ${wid}` : `Kết nối ${wid}`}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-500 leading-relaxed">
              {isEn ? (
                <>
                  No Cardano browser wallet extension detected (supports <strong>Eternl, Lace, Vespr, Nami, Typhon, Yoroi</strong>). Enable Preprod Testnet mode in your wallet to connect.
                </>
              ) : (
                <>
                  Chưa phát hiện tiện ích ví Cardano trên trình duyệt (hỗ trợ <strong>Eternl, Lace, Vespr, Nami, Typhon, Yoroi</strong>). Hãy bật chế độ Preprod Testnet trong ví để kết nối.
                </>
              )}
            </p>
          )}
        </section>
      </div>

      {/* NFT Mint Studio + Minted History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleMint}
          className="lg:col-span-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4"
        >
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {isEn ? 'On-chain Testnet NFT Mint Studio' : 'Studio Đúc NFT On-chain Testnet'}
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-600 dark:text-ink-400">
              {isEn ? 'NFT Category' : 'Loại NFT'}
            </label>
            <select
              value={nftType}
              onChange={(e) => setNftType(e.target.value as 'passport' | 'certificate' | 'proof')}
              className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs"
            >
              <option value="passport">
                {isEn
                  ? 'VNE-PASSPORT — Digital Economy Passport (Dynamic ERC-721)'
                  : 'VNE-PASSPORT — Hộ chiếu Kinh tế số (Dynamic ERC-721)'}
              </option>
              <option value="certificate">
                {isEn ? 'VNE-CERT — Course Completion Certificate' : 'VNE-CERT — Chứng chỉ Hoàn thành Khóa học'}
              </option>
              <option value="proof">
                {isEn ? 'VNE-PROOF — SHA-256 Academic Research Proof' : 'VNE-PROOF — Bằng chứng Học thuật SHA-256'}
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-600 dark:text-ink-400">
              {isEn ? 'Display Title on NFT' : 'Tên hiển thị trên NFT'}
            </label>
            <input
              type="text"
              value={nftTitle}
              onChange={(e) => setNftTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-600 dark:text-ink-400">
              {isEn ? 'Target Testnet Chain' : 'Chuỗi Testnet đúc NFT'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChainFamily('evm')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                  chainFamily === 'evm' ? 'border-editorial-teal bg-editorial-teal/10 text-editorial-teal' : 'border-paper-300 dark:border-ink-700'
                }`}
              >
                EVM Testnet (ERC-721)
              </button>
              <button
                type="button"
                onClick={() => setChainFamily('cardano')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                  chainFamily === 'cardano' ? 'border-editorial-navy bg-editorial-navy/10 text-editorial-navy dark:text-sky-300' : 'border-paper-300 dark:border-ink-700'
                }`}
              >
                Cardano Preprod (CIP-25)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={minting}
            className="w-full py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {minting
              ? isEn
                ? 'Generating SHA-256 Proof & Minting NFT...'
                : 'Đang tạo SHA-256 Proof & Đúc NFT...'
              : isEn
                ? `Mint Testnet NFT (Tier ${points.tierLevel})`
                : `Đúc NFT Testnet (Cấp ${points.tierLevel}: ${points.tierTitle})`}
          </button>
        </form>

        <section className="lg:col-span-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-editorial-teal" />
            {isEn ? `Minted NFTs & Certificates (${nfts.length})` : `NFT & Chứng chỉ đã đúc (${nfts.length})`}
          </h2>

          {nfts.length === 0 ? (
            <p className="text-xs text-ink-500">
              {isEn
                ? 'No NFTs minted yet. Connect a Testnet wallet on the left and click Mint Testnet NFT.'
                : 'Chưa có NFT nào. Hãy kết nối ví Testnet bên trên và bấm Đúc NFT.'}
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {nfts.map((n) => (
                <div
                  key={n.verifyCode}
                  className="p-3.5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-bold text-ink-950 dark:text-paper-50 truncate">{n.title}</div>
                    <div className="text-[11px] text-ink-500 font-mono truncate">
                      {n.verifyCode} • {n.network}
                    </div>
                  </div>
                  <Link
                    to={`/verify/${n.verifyCode}`}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-editorial-teal text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    {isEn ? 'Verify' : 'Xác thực'} <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
