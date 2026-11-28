import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Fuel,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { hasRegisteredAccount, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import {
  connectCardanoWallet,
  connectEvmTestnetWallet,
  detectCardanoWallets,
  switchToBaseSepolia,
  type CardanoWalletState,
  type EvmWalletState,
} from '../web3/multiChainWalletService.ts';
import {
  DAILY_SWAP_CAP_VNE,
  executeTestnetSwap,
  getSimPointsBalance,
  getSwapHistory,
  getTodaySwappedVne,
  TESTNET_SWAP_PACKAGES,
  VNE_CARDANO_TESTNET_TREASURY,
  VNE_EVM_TREASURY_ADDRESS,
  type TestnetSwapPackage,
} from './simLabsService.ts';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export const TestnetSwapPage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Testnet Token Swap → VNE Points ($0 Real Money) | VNEconomics'
      : 'Đổi Token Testnet → VNE Points (0đ Tiền thật) | VNEconomics',
    description: isEn
      ? 'Send Base/Ethereum Sepolia ETH or Cardano Preprod tADA to the official VNEconomics Testnet treasury to earn VNE Points.'
      : 'Chuyển Token Testnet (ETH Sepolia / tADA Preprod) vào ví trung gian VNEconomics để đổi lấy VNE Points học tập.',
    canonicalPath: '/mo-phong/testnet-swap/',
  });

  const [points, setPoints] = useState(() => getSimPointsBalance());
  const [todaySwapped, setTodaySwapped] = useState(() => getTodaySwappedVne());
  const [history, setHistory] = useState(() => getSwapHistory());
  const [evm, setEvm] = useState<EvmWalletState | null>(null);
  const [cardano, setCardano] = useState<CardanoWalletState | null>(null);
  const [cardanoWallets] = useState<string[]>(() => detectCardanoWallets());
  const [selectedPkgId, setSelectedPkgId] = useState<string>('evm_starter');
  const [manualTxHash, setManualTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<'evm' | 'cardano' | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      setPoints(getSimPointsBalance());
      setTodaySwapped(getTodaySwappedVne());
      setHistory(getSwapHistory());
    };
    window.addEventListener(POINTS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, sync);
  }, []);

  const selectedPkg: TestnetSwapPackage =
    TESTNET_SWAP_PACKAGES.find((p) => p.id === selectedPkgId) || TESTNET_SWAP_PACKAGES[0];

  const handleCopy = (type: 'evm' | 'cardano', value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedAddr(type);
    setTimeout(() => setCopiedAddr(null), 1800);
  };

  const handleConnectEvm = async () => {
    try {
      const state = await connectEvmTestnetWallet();
      setEvm(state);
      setNotice({
        ok: !state.isMainnetDanger,
        msg: state.isMainnetDanger
          ? isEn
            ? 'Mainnet detected! Switch to Base Sepolia Testnet before swapping.'
            : 'Phát hiện mạng Mainnet! Hãy chuyển sang Base Sepolia Testnet trước khi đổi điểm.'
          : isEn
            ? `Connected ${state.walletName} (${state.networkName}).`
            : `Đã kết nối ${state.walletName} (${state.networkName}).`,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'EVM connection failed.' });
    }
  };

  const handleConnectCardano = async (walletId: string) => {
    try {
      const state = await connectCardanoWallet(walletId);
      setCardano(state);
      setNotice({
        ok: state.isTestnet,
        msg: state.isMainnetDanger
          ? isEn
            ? 'Cardano wallet is on Mainnet. Please switch to Preprod Testnet.'
            : 'Ví Cardano đang ở Mainnet. Vui lòng chuyển sang Preprod Testnet.'
          : isEn
            ? `Connected Cardano ${walletId.toUpperCase()} (Preprod Testnet).`
            : `Đã kết nối ví Cardano ${walletId.toUpperCase()} (Preprod Testnet).`,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'Cardano connection failed.' });
    }
  };

  const handleDirectEvmSend = async () => {
    if (!hasRegisteredAccount()) {
      setNotice({
        ok: false,
        msg: isEn
          ? 'Please register a VNEconomics account first to credit swapped VNE Points.'
          : 'Vui lòng đăng ký tài khoản VNEconomics trước để nhận VNE Points vào ví.',
      });
      return;
    }
    if (!evm || evm.isMainnetDanger) {
      setNotice({
        ok: false,
        msg: isEn
          ? 'Connect an EVM Testnet wallet (non-Mainnet) first.'
          : 'Hãy kết nối ví EVM Testnet (không phải Mainnet) trước.',
      });
      return;
    }
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) return;

    setBusy(true);
    try {
      const txHash = (await eth.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: evm.address,
            to: VNE_EVM_TREASURY_ADDRESS,
            value: selectedPkg.amountWeiHex || '0x38d7ea4c68000',
          },
        ],
      })) as string;

      const res = executeTestnetSwap({
        pkg: selectedPkg,
        network: evm.networkName,
        fromAddress: evm.address,
        txHash,
      });
      setNotice({ ok: res.ok, msg: res.message });
      setPoints(getSimPointsBalance());
      setTodaySwapped(getTodaySwappedVne());
      setHistory(getSwapHistory());
    } catch (err) {
      setNotice({
        ok: false,
        msg: err instanceof Error ? err.message : isEn ? 'Transaction rejected.' : 'Giao dịch đã bị hủy.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleManualTxVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fromAddr =
      selectedPkg.chainFamily === 'evm'
        ? evm?.address || '0xTestnetSender'
        : cardano?.addressHex || 'addr_test1_sender';
    const net =
      selectedPkg.chainFamily === 'evm'
        ? evm?.networkName || 'EVM Sepolia Testnet'
        : 'Cardano Preprod Testnet';

    const res = executeTestnetSwap({
      pkg: selectedPkg,
      network: net,
      fromAddress: fromAddr,
      txHash: manualTxHash,
    });
    setNotice({ ok: res.ok, msg: res.message });
    if (res.ok) {
      setManualTxHash('');
      setPoints(getSimPointsBalance());
      setTodaySwapped(getTodaySwappedVne());
      setHistory(getSwapHistory());
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#146EBE] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            {isEn ? '0-Cost Testnet Bridge • Anti-Replay' : 'Cổng Quy đổi Testnet 0đ • Chống lặp txHash'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn ? 'Swap Testnet Tokens → VNE Points' : 'Đổi Token Testnet → VNE Points'}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
            {isEn
              ? 'Transfer free Testnet ETH (Sepolia) or tADA (Cardano Preprod) to the official VNEconomics treasury wallet below to receive VNE Points immediately.'
              : 'Chuyển Token Testnet miễn phí (ETH Sepolia hoặc tADA Cardano Preprod) vào ví trung gian chính thức của VNEconomics bên dưới để đổi VNE Points vào tài khoản.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Your Balance' : 'Số dư Ví VNE'}</div>
            <div className="text-2xl font-extrabold tabular-nums text-amber-300 inline-flex items-center gap-1.5">
              <Coins className="w-5 h-5" /> {points} VNE
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Daily Swap Limit' : 'Hạn mức hôm nay'}</div>
            <div className="text-2xl font-extrabold tabular-nums">
              {todaySwapped}/{DAILY_SWAP_CAP_VNE}
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Testnet-Only Warning */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border-2 border-rose-300 dark:border-rose-800 flex items-start gap-3 text-xs sm:text-sm text-rose-900 dark:text-rose-200">
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold uppercase tracking-wide">
            {isEn
              ? 'Important: Connect or Switch to a Testnet Wallet First!'
              : 'Lưu ý quan trọng: Bắt buộc kết nối hoặc chuyển sang Ví Testnet!'}
          </div>
          <p className="text-xs leading-relaxed">
            {isEn
              ? 'Only use Testnet networks (Base Sepolia, Ethereum Sepolia, Polygon Amoy, or Cardano Preprod Testnet) with $0 real money. Do NOT send real Mainnet ETH or Mainnet ADA to these treasury addresses.'
              : 'Vui lòng kiểm tra và chuyển ví của bạn sang mạng Testnet (Base Sepolia, Ethereum Sepolia, Polygon Amoy hoặc Cardano Preprod Testnet — 0đ tiền thật) trước khi thực hiện giao dịch. Tuyệt đối KHÔNG gửi ETH/ADA Mainnet thật.'}
          </p>
        </div>
      </div>

      {!hasRegisteredAccount() && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-amber-900 dark:text-amber-200">
            {isEn
              ? 'Account registration is required so swapped VNE Points can be credited to your wallet.'
              : 'Cần đăng ký tài khoản VNEconomics để nhận VNE Points quy đổi từ Token Testnet vào ví.'}
          </span>
          <Link to="/tai-khoan/" className="px-4 py-2 rounded-xl bg-[#146EBE] text-white font-bold shrink-0">
            {isEn ? 'Register Account →' : 'Đăng ký tài khoản →'}
          </Link>
        </div>
      )}

      {/* Official VNEconomics Treasury Wallets */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
              {isEn ? 'EVM Testnet Treasury (Sepolia / Base / Amoy)' : 'Ví Trung gian EVM Testnet (Sepolia / Base / Amoy)'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy('evm', VNE_EVM_TREASURY_ADDRESS)}
              className="px-2.5 py-1 rounded-lg bg-paper-200 dark:bg-ink-800 text-xs font-bold inline-flex items-center gap-1"
            >
              {copiedAddr === 'evm' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAddr === 'evm' ? (isEn ? 'Copied' : 'Đã chép') : isEn ? 'Copy' : 'Sao chép'}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-paper-100 dark:bg-ink-950 font-mono text-xs break-all border border-paper-200 dark:border-ink-800">
            {VNE_EVM_TREASURY_ADDRESS}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#146EBE] font-semibold hover:underline"
            >
              <Fuel className="w-3.5 h-3.5" /> Base Sepolia Faucet <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href={`https://sepolia.basescan.org/address/${VNE_EVM_TREASURY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              BaseScan Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {isEn ? 'Cardano Preprod Treasury (tADA)' : 'Ví Trung gian Cardano Preprod Testnet (tADA)'}
            </span>
            <button
              type="button"
              onClick={() => handleCopy('cardano', VNE_CARDANO_TESTNET_TREASURY)}
              className="px-2.5 py-1 rounded-lg bg-paper-200 dark:bg-ink-800 text-xs font-bold inline-flex items-center gap-1"
            >
              {copiedAddr === 'cardano' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAddr === 'cardano' ? (isEn ? 'Copied' : 'Đã chép') : isEn ? 'Copy' : 'Sao chép'}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-paper-100 dark:bg-ink-950 font-mono text-[11px] break-all border border-paper-200 dark:border-ink-800">
            {VNE_CARDANO_TESTNET_TREASURY}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://docs.cardano.org/cardano-testnets/tools/faucet/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              <Fuel className="w-3.5 h-3.5" /> Cardano Preprod Faucet <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href={`https://preprod.cardanoscan.io/address/${VNE_CARDANO_TESTNET_TREASURY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              Preprod CardanoScan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold ${
            notice.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Swap Packages & Execution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
          <h2 className="font-serif text-lg font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#146EBE]" />
            {isEn ? '1. Choose Swap Package' : '1. Chọn gói quy đổi Token Testnet'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TESTNET_SWAP_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPkgId(pkg.id)}
                className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                  selectedPkgId === pkg.id
                    ? 'border-[#146EBE] bg-[#146EBE]/10 dark:bg-sky-950/40'
                    : 'border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 hover:border-[#146EBE]'
                }`}
              >
                <div className="text-[11px] font-bold uppercase text-[#146EBE] dark:text-sky-400">
                  {pkg.chainFamily === 'evm' ? 'EVM Testnet' : 'Cardano Preprod'}
                </div>
                <div className="text-xs font-bold text-ink-950 dark:text-paper-50">
                  {isEn ? pkg.titleEn : pkg.titleVi}
                </div>
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-3 border-t border-paper-200 dark:border-ink-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {isEn ? '2. Connect Testnet Wallet & Send Directly' : '2. Kết nối / Chuyển sang Ví Testnet & Gửi trực tiếp'}
            </h3>
            {selectedPkg.chainFamily === 'evm' ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleConnectEvm}
                  className="px-4 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4 text-[#146EBE]" />
                  {evm ? `${evm.address.slice(0, 6)}...${evm.address.slice(-4)}` : isEn ? 'Connect EVM Wallet' : 'Kết nối Ví EVM'}
                </button>
                {evm?.isMainnetDanger && (
                  <button
                    type="button"
                    onClick={() => switchToBaseSepolia().then(handleConnectEvm)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    {isEn ? 'Switch to Base Sepolia' : 'Chuyển sang Base Sepolia'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDirectEvmSend}
                  className="px-5 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isEn ? `Send ${selectedPkg.amountLabel} & Claim +${selectedPkg.vneReward} VNE` : `Gửi ${selectedPkg.amountLabel} & Nhận +${selectedPkg.vneReward} VNE`}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {(cardanoWallets.length > 0 ? cardanoWallets : ['eternl', 'lace', 'vespr']).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleConnectCardano(w)}
                    className="px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs font-bold uppercase"
                  >
                    {cardano?.walletId === w ? `${w} ✓` : w}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verify txHash Form */}
        <form
          onSubmit={handleManualTxVerify}
          className="lg:col-span-5 p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4"
        >
          <h2 className="font-serif text-lg font-bold">
            {isEn ? '3. Verify Submitted Testnet txHash' : '3. Xác nhận mã giao dịch (txHash) đã chuyển'}
          </h2>
          <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
            {isEn
              ? 'If you transferred Testnet ETH or tADA directly from your wallet to the VNEconomics treasury address above, paste the txHash here to redeem VNE Points (1 redemption per txHash).'
              : 'Nếu bạn đã chuyển Testnet ETH hoặc tADA trực tiếp từ ví vào địa chỉ ví trung gian VNEconomics ở trên, dán mã giao dịch (txHash) vào đây để quy đổi VNE Points (mỗi txHash chỉ dùng 1 lần).'}
          </p>
          <input
            required
            type="text"
            value={manualTxHash}
            onChange={(e) => setManualTxHash(e.target.value)}
            placeholder="0x... or Cardano txHash"
            className="w-full px-3.5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 font-mono text-xs"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            {isEn ? `Verify txHash & Credit +${selectedPkg.vneReward} VNE` : `Xác thực txHash & Cộng +${selectedPkg.vneReward} VNE`}
          </button>
        </form>
      </section>

      {/* Swap History */}
      {history.length > 0 && (
        <section className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
          <h2 className="font-serif text-lg font-bold">
            {isEn ? 'Recent Testnet Swap Receipts' : 'Lịch sử Quy đổi Token Testnet'}
          </h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <strong className="text-emerald-700 dark:text-emerald-400">+{item.vneCredited} VNE</strong> •{' '}
                  <span>{item.amountLabel}</span> • <span className="text-ink-500">{item.network}</span>
                </div>
                <span className="font-mono text-[11px] text-ink-500 truncate max-w-xs">{item.txHash}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
