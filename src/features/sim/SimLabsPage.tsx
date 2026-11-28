import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Coins,
  Cpu,
  ExternalLink,
  Filter,
  FlaskConical,
  Landmark,
  Loader2,
  Megaphone,
  ShieldCheck,
  Vote,
  Wallet,
} from 'lucide-react';
import { MacroLabPanel } from './MacroLabPanel.tsx';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { claimPracticePoints, getPointsState, spendVnePoints } from '../game/vneGameService.ts';
import {
  connectCardanoWallet,
  connectEvmTestnetWallet,
  detectCardanoWallets,
  executeCardanoTestnetOnChainAction,
  executeEvmTestnetOnChainAction,
  switchToBaseSepolia,
  type CardanoWalletState,
  type EvmWalletState,
} from '../web3/multiChainWalletService.ts';
import {
  DAO_PROPOSE_BONUS_VNE,
  DAO_VOTE_BONUS_VNE,
  DEFI_HARVEST_BONUS_VNE,
  DEFI_STAKE_BONUS_VNE,
  getDaoProposals,
  getDefiStakes,
  harvestOnChainDefiStake,
  recordOnChainDaoProposal,
  recordOnChainDaoVote,
  recordOnChainDefiStake,
  SIM_MENU_ITEMS,
  VNE_EVM_TREASURY_ADDRESS,
  type GovActionType,
} from './simLabsService.ts';

export const SimLabsPage: React.FC = () => {
  const { labSlug = 'san-vi-mo' } = useParams<{ labSlug: string }>();
  const { isEn } = useTranslation();

  const [points, setPoints] = useState(() => getPointsState().totalPoints);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  // 2. DeFi Staking & IL Calculator + On-chain Testnet Wallet
  const [stakes, setStakes] = useState(() => getDefiStakes());
  const [ilPriceChangePct, setIlPriceChangePct] = useState(50);
  const [evm, setEvm] = useState<EvmWalletState | null>(null);
  const [cardano, setCardano] = useState<CardanoWalletState | null>(null);
  const [cardanoWallets] = useState<string[]>(() => detectCardanoWallets());
  const [activeChainMode, setActiveChainMode] = useState<'evm' | 'cardano'>('evm');
  const [onChainBusy, setOnChainBusy] = useState(false);

  // 3. DAO On-chain Governance (Tempo.vote CIP-1694 Explorer)
  const [proposals, setProposals] = useState(() => getDaoProposals());
  const [govTypeFilter, setGovTypeFilter] = useState<'all' | GovActionType>('all');
  const [govStatusFilter, setGovStatusFilter] = useState<'all' | 'active' | 'ratified'>('all');
  const [govSearch, setGovSearch] = useState('');
  const [voteRationale, setVoteRationale] = useState('');
  const [newPropType, setNewPropType] = useState<GovActionType>('economy');
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDesc, setNewPropDesc] = useState('');

  // 4. Marketing ROI Simulator
  const [seoBudget, setSeoBudget] = useState(30);
  const [adsBudget, setAdsBudget] = useState(40);
  const [kolBudget, setKolBudget] = useState(30);
  const [abBoost, setAbBoost] = useState(false);

  // 5. AI & Big Data Lab
  const [dataCleaned, setDataCleaned] = useState(false);

  // 6. Academic Peer Review Council
  const [citationAudited, setCitationAudited] = useState(false);
  const [peerReviewed, setPeerReviewed] = useState(false);

  const meta = SIM_MENU_ITEMS.find((m) => m.slug === labSlug) || SIM_MENU_ITEMS[2];

  useSEO({
    title: `${isEn ? meta.titleEn : meta.titleVi} | VNEconomics`,
    description: isEn ? meta.descEn : meta.descVi,
    canonicalPath: `/mo-phong/${labSlug}/`,
  });

  const refreshPoints = (ok: boolean, msg: string) => {
    setPoints(getPointsState().totalPoints);
    setNotice({ ok, msg });
  };
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const handleConnectEvm = async () => {
    try {
      const state = await connectEvmTestnetWallet();
      setEvm(state);
      setActiveChainMode('evm');
      setNotice({
        ok: !state.isMainnetDanger,
        msg: state.isMainnetDanger
          ? isEn
            ? 'Mainnet detected! Switch to Base Sepolia Testnet before executing on-chain DeFi/Voting.'
            : 'Phát hiện mạng Mainnet! Hãy chuyển sang Base Sepolia Testnet trước khi thực hiện DeFi/Voting.'
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
      setActiveChainMode('cardano');
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

  const runOnChainTestnetTx = async (actionTag: string, valueWeiHex?: string) => {
    if (activeChainMode === 'evm') {
      if (!evm) throw new Error(isEn ? 'Connect EVM Testnet wallet first.' : 'Vui lòng kết nối ví EVM Testnet trước.');
      return executeEvmTestnetOnChainAction({
        evm,
        toAddress: VNE_EVM_TREASURY_ADDRESS,
        actionTag,
        valueWeiHex,
      });
    }
    if (!cardano) {
      throw new Error(isEn ? 'Connect Cardano Preprod Testnet wallet first.' : 'Vui lòng kết nối ví Cardano Preprod Testnet trước.');
    }
    return executeCardanoTestnetOnChainAction({ cardano, actionTag });
  };

  const renderOnChainWalletBar = () => (
    <div className="p-5 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-rose-800 dark:text-rose-200">
              {isEn
                ? 'ON-CHAIN TESTNET EXECUTION REQUIRED (VNE Points = Bonus Reward)'
                : 'BẮT BUỘC THỰC HIỆN ON-CHAIN TESTNET (VNE Points chỉ là phần thưởng Bonus)'}
            </div>
            <p className="text-rose-700 dark:text-rose-300">
              {isEn
                ? 'Connect or switch your wallet to Testnet (Base Sepolia, Ethereum Sepolia or Cardano Preprod — $0 real value). Every DeFi stake, harvest & DAO vote sends a real verifiable Testnet transaction.'
                : 'Vui lòng kết nối hoặc chuyển sang ví Testnet (Base Sepolia, Ethereum Sepolia hoặc Cardano Preprod — 0đ tiền thật). Mọi lệnh DeFi & Biểu quyết DAO đều ghi nhận trực tiếp trên Testnet.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveChainMode('evm')}
            className={`px-3 py-1.5 rounded-lg font-bold border ${activeChainMode === 'evm' ? 'bg-[#146EBE] text-white border-[#146EBE]' : 'bg-white dark:bg-ink-900 border-paper-300 dark:border-ink-700'}`}
          >
            EVM Testnet
          </button>
          <button
            type="button"
            onClick={() => setActiveChainMode('cardano')}
            className={`px-3 py-1.5 rounded-lg font-bold border ${activeChainMode === 'cardano' ? 'bg-[#146EBE] text-white border-[#146EBE]' : 'bg-white dark:bg-ink-900 border-paper-300 dark:border-ink-700'}`}
          >
            Cardano Preprod
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <button
          type="button"
          onClick={handleConnectEvm}
          className="px-3.5 py-2 rounded-xl bg-ink-900 dark:bg-paper-100 text-white dark:text-ink-950 font-bold inline-flex items-center gap-1.5"
        >
          <Wallet className="w-3.5 h-3.5" />
          {evm?.connected ? `${evm.walletName}: ${evm.address.slice(0, 6)}...${evm.address.slice(-4)}` : isEn ? 'Connect EVM Testnet' : 'Kết nối ví EVM Testnet'}
        </button>
        {evm?.isMainnetDanger && (
          <button
            type="button"
            onClick={async () => {
              await switchToBaseSepolia();
              await handleConnectEvm();
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold"
          >
            {isEn ? 'Switch to Base Sepolia' : 'Chuyển sang Base Sepolia'}
          </button>
        )}
        {cardanoWallets.length > 0 ? (
          cardanoWallets.map((wId) => (
            <button
              key={wId}
              type="button"
              onClick={() => handleConnectCardano(wId)}
              className="px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-white dark:bg-ink-900 font-bold"
            >
              {cardano?.walletId === wId ? `✓ ${wId.toUpperCase()} (Preprod)` : `Cardano: ${wId.toUpperCase()}`}
            </button>
          ))
        ) : (
          <Link to="/cardano-hub/" className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-white dark:bg-ink-900 font-semibold">
            {isEn ? 'Setup Cardano Preprod Wallet →' : 'Hướng dẫn ví Cardano Preprod →'}
          </Link>
        )}
      </div>
    </div>
  );

  // Impermanent Loss formula: 2 * sqrt(k) / (1 + k) - 1
  const kRatio = Math.max(0.1, 1 + ilPriceChangePct / 100);
  const ilPct = ((2 * Math.sqrt(kRatio)) / (1 + kRatio) - 1) * 100;

  const estimatedRoas = Number(
    (1.8 + seoBudget * 0.02 + adsBudget * 0.015 + kolBudget * 0.018 + (abBoost ? 0.85 : 0)).toFixed(2),
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#146EBE] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/learn-and-earn/"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isEn ? 'Sim Hub' : 'Trung tâm Mô phỏng'}
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/30 text-[10px] font-bold text-emerald-200">
              <ShieldCheck className="w-3 h-3" /> {isEn ? '$0 Sandbox Lab' : 'Phòng Thí nghiệm 0đ'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn ? meta.titleEn : meta.titleVi}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100">{isEn ? meta.descEn : meta.descVi}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Wallet Balance' : 'Số dư Ví VNE'}</div>
            <div className="text-2xl font-extrabold tabular-nums text-amber-300 inline-flex items-center gap-1.5">
              <Coins className="w-5 h-5" /> {points} VNE
            </div>
          </div>
          <Link
            to="/mo-phong/testnet-swap/"
            className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-ink-950 text-xs font-bold"
          >
            {isEn ? 'Swap Testnet → VNE' : 'Đổi Testnet → VNE'}
          </Link>
        </div>
      </section>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
            notice.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          <span>{notice.msg}</span>
          {!notice.ok && (
            <Link to="/mo-phong/testnet-swap/" className="underline font-bold text-[#146EBE]">
              {isEn ? 'Get VNE via Testnet Swap →' : 'Nạp VNE bằng Token Testnet →'}
            </Link>
          )}
        </div>
      )}

      {/* LAB 1: SAN VI MO */}
      {labSlug === 'san-vi-mo' && <MacroLabPanel onPointsChanged={refreshPoints} />}

      {/* LAB 2: DEFI STAKING & IMPERMANENT LOSS (ON-CHAIN TESTNET) */}
      {labSlug === 'defi-lab' && (
        <div className="space-y-6">
          {renderOnChainWalletBar()}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-violet-600" />
                {isEn ? 'On-Chain DeFi Staking Pools (Testnet)' : 'Bể Staking DeFi On-chain (Testnet)'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Cardano SPO Pool', apy: 12, label: '0.0001 Testnet ETH / Preprod Proof', weiHex: '0x5af3107a4000' },
                  { name: 'DeFi High-Yield Vault', apy: 20, label: '0.0005 Testnet ETH / Preprod Proof', weiHex: '0x1c6bf52634000' },
                ].map((pool) => (
                  <div key={pool.name} className="p-4 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 space-y-2">
                    <div className="text-xs font-bold">{pool.name}</div>
                    <div className="text-lg font-extrabold text-emerald-600">{pool.apy}% APY</div>
                    <div className="text-[11px] text-ink-500">
                      {isEn ? `Bonus: +${DEFI_STAKE_BONUS_VNE} VNE Points` : `Thưởng Bonus: +${DEFI_STAKE_BONUS_VNE} VNE Points`}
                    </div>
                    <button
                      type="button"
                      disabled={onChainBusy}
                      onClick={async () => {
                        setOnChainBusy(true);
                        try {
                          const proof = await runOnChainTestnetTx(`DEFI_STAKE:${pool.name}`, pool.weiHex);
                          const res = recordOnChainDefiStake({
                            poolName: pool.name,
                            apyPct: pool.apy,
                            stakedLabel: pool.label,
                            chainFamily: proof.chainFamily,
                            network: proof.network,
                            txHash: proof.txHash,
                            explorerUrl: proof.explorerUrl,
                          });
                          setStakes(res.stakes);
                          refreshPoints(res.ok, res.message);
                        } catch (err) {
                          refreshPoints(false, err instanceof Error ? err.message : 'On-chain DeFi transaction cancelled.');
                        } finally {
                          setOnChainBusy(false);
                        }
                      }}
                      className="w-full py-2 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      {onChainBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isEn ? `Stake On-chain (+${DEFI_STAKE_BONUS_VNE} VNE)` : `Stake On-chain (+${DEFI_STAKE_BONUS_VNE} VNE)`}
                    </button>
                  </div>
                ))}
              </div>

              {stakes.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold">{isEn ? 'Active On-chain Testnet Stakes' : 'Vị thế đang Staking On-chain'}</div>
                  {stakes.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div>
                          <strong>{s.poolName}</strong> • {s.apyPct}% APY ({s.network})
                        </div>
                        <a
                          href={s.explorerUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#146EBE] hover:underline"
                        >
                          {s.txHash ? `${s.txHash.slice(0, 14)}...` : isEn ? 'Legacy Sim Stake' : 'Vị thế cũ'} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <button
                        type="button"
                        disabled={onChainBusy}
                        onClick={async () => {
                          setOnChainBusy(true);
                          try {
                            const proof = await runOnChainTestnetTx(`DEFI_HARVEST:${s.poolName}`, '0x0');
                            const res = harvestOnChainDefiStake({ stakeId: s.id, txHash: proof.txHash });
                            setStakes(res.stakes);
                            refreshPoints(res.ok, res.message);
                          } catch (err) {
                            refreshPoints(false, err instanceof Error ? err.message : 'On-chain harvest cancelled.');
                          } finally {
                            setOnChainBusy(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                      >
                        {isEn ? `Harvest On-chain (+${DEFI_HARVEST_BONUS_VNE} VNE)` : `Thu hoạch On-chain (+${DEFI_HARVEST_BONUS_VNE} VNE)`}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
              <h2 className="font-serif text-xl font-bold">
                {isEn ? 'AMM Impermanent Loss Simulator' : 'Mô phỏng Tổn thất Tạm thời (AMM Pool)'}
              </h2>
              <p className="text-xs text-ink-600 dark:text-ink-400">
                {isEn
                  ? 'Adjust token price change (%) in an ADA/USDC liquidity pool to observe Impermanent Loss vs. HODL.'
                  : 'Kéo thanh trượt biến động giá (%) trong bể thanh khoản ADA/USDC để quan sát Tổn thất tạm thời (IL) so với việc giữ nguyên (HODL).'}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{isEn ? 'Price Change:' : 'Biến động giá:'}</span>
                  <span>+{ilPriceChangePct}%</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={400}
                  value={ilPriceChangePct}
                  onChange={(e) => setIlPriceChangePct(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-sm font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                {isEn ? 'Impermanent Loss:' : 'Tổn thất tạm thời (IL):'} {ilPct.toFixed(2)}%
              </div>
            </div>
          </section>
        </div>
      )}

      {/* LAB 3: DAO GOVERNANCE EXPLORER (ECONOMY, BLOCKCHAIN, SOCIETY, ENVIRONMENT) */}
      {labSlug === 'dao-drep' && (() => {
        const actionTypeLabel = (t: GovActionType) => {
          const map: Record<GovActionType, { vi: string; en: string }> = {
            economy: { vi: 'Kinh tế & Tài chính', en: 'Economy & Finance' },
            blockchain: { vi: 'Blockchain & Web3', en: 'Blockchain & Web3' },
            society: { vi: 'Xã hội & Giáo dục', en: 'Society & Education' },
            environment: { vi: 'Môi trường & ESG', en: 'Environment & ESG' },
            governance: { vi: 'Chính sách & Quản trị', en: 'Policy & Governance' },
          };
          const entry = map[t] || map.governance;
          return isEn ? entry.en : entry.vi;
        };

        const filteredProposals = proposals.filter((p) => {
          if (govTypeFilter !== 'all' && p.actionType !== govTypeFilter) return false;
          if (govStatusFilter !== 'all' && p.status !== govStatusFilter) return false;
          if (govSearch.trim()) {
            const q = govSearch.trim().toLowerCase();
            const text = `${p.titleVi} ${p.titleEn} ${p.govActionId}`.toLowerCase();
            if (!text.includes(q)) return false;
          }
          return true;
        });

        const handleCastVote = async (
          proposalId: string,
          choice: 'yes' | 'abstain' | 'no',
        ) => {
          setOnChainBusy(true);
          try {
            const proof = await runOnChainTestnetTx(`CIP1694_${choice.toUpperCase()}:${proposalId}`, '0x0');
            const res = recordOnChainDaoVote({
              proposalId,
              support: choice === 'yes',
              voteChoice: choice,
              rationale: voteRationale,
              network: proof.network,
              txHash: proof.txHash,
              explorerUrl: proof.explorerUrl,
            });
            setProposals(res.proposals);
            if (res.ok) setVoteRationale('');
            refreshPoints(res.ok, res.message);
          } catch (err) {
            refreshPoints(false, err instanceof Error ? err.message : 'On-chain vote cancelled.');
          } finally {
            setOnChainBusy(false);
          }
        };

        return (
          <section className="space-y-5">
            {renderOnChainWalletBar()}

            {/* E-Commerce Filter Sidebar (Left) + Governance Proposals Grid (Right) */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
              <button
                type="button"
                onClick={() => setMobileFilterOpen((v) => !v)}
                className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 text-xs font-bold shadow-xs"
              >
                <Filter className="w-3.5 h-3.5 text-[#146EBE]" />
                <span>{mobileFilterOpen ? (isEn ? 'Hide Filters' : 'Thu gọn Bộ lọc') : (isEn ? 'DAO Proposal Filters' : 'Bộ lọc Đề xuất DAO')}</span>
              </button>

              <aside className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0 lg:sticky lg:top-20 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-5 text-xs`}>
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-ink-900 dark:text-paper-50 pb-2 border-b border-paper-200 dark:border-ink-800">
                  <Filter className="w-4 h-4 text-[#146EBE]" />
                  <span>{isEn ? 'DAO Proposal Filters' : 'Bộ lọc Đề xuất DAO'}</span>
                </div>

                {/* Category List with Counts */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-2 pb-1">
                    {isEn ? 'Proposal Domains' : 'Lĩnh vực Đề xuất'}
                  </div>
                  {(['all', 'economy', 'blockchain', 'society', 'environment', 'governance'] as const).map((t) => {
                    const count =
                      t === 'all' ? proposals.length : proposals.filter((p) => p.actionType === t).length;
                    const active = govTypeFilter === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGovTypeFilter(t)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                          active
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-700 dark:text-ink-300 hover:bg-paper-100 dark:hover:bg-ink-800 font-medium'
                        }`}
                      >
                        <span className="truncate">
                          {t === 'all' ? (isEn ? 'All Proposals' : 'Tất cả Đề xuất') : actionTypeLabel(t)}
                        </span>
                        <span className="tabular-nums text-[11px]">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Status Radio/Check Filter */}
                <div className="space-y-2 pt-3 border-t border-paper-200 dark:border-ink-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-1">
                    {isEn ? 'Voting Status' : 'Trạng thái Biểu quyết'}
                  </div>
                  {(['all', 'active', 'ratified'] as const).map((st) => (
                    <label
                      key={st}
                      className="flex items-center gap-2.5 px-1 py-0.5 cursor-pointer text-ink-700 dark:text-ink-300"
                    >
                      <input
                        type="checkbox"
                        checked={govStatusFilter === st}
                        onChange={() => setGovStatusFilter(st)}
                        className="rounded border-paper-300 text-[#146EBE] focus:ring-[#146EBE]"
                      />
                      <span className="font-medium">
                        {st === 'all' ? (isEn ? 'All Statuses' : 'Mọi trạng thái') : st === 'active' ? 'Active' : 'Ratified'}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Search & Rationale */}
                <div className="space-y-2 pt-3 border-t border-paper-200 dark:border-ink-800">
                  <input
                    value={govSearch}
                    onChange={(e) => setGovSearch(e.target.value)}
                    placeholder={isEn ? 'Search ID or title...' : 'Tìm theo mã hoặc tiêu đề...'}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950"
                  />
                  <input
                    value={voteRationale}
                    onChange={(e) => setVoteRationale(e.target.value)}
                    placeholder={isEn ? 'Optional CIP-100 rationale...' : 'Lý do biểu quyết (tùy chọn)...'}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950"
                  />
                </div>
              </aside>

              {/* Right Content: Governance Actions Grid + Submit Form */}
              <div className="flex-1 min-w-0 w-full space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredProposals.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-[#146EBE] font-bold inline-flex items-center gap-1">
                        <Vote className="w-3 h-3" /> {actionTypeLabel(p.actionType)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                          p.status === 'ratified'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <span className="font-mono text-ink-500">
                      {isEn ? `Expires Epoch ${p.expiresEpoch}` : `Hết hạn Epoch ${p.expiresEpoch}`}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold leading-snug">{isEn ? p.titleEn : p.titleVi}</h3>
                    <div className="font-mono text-[10px] text-ink-400 mt-0.5 truncate">{p.govActionId}</div>
                  </div>
                  <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">{isEn ? p.descEn : p.descVi}</p>

                  {/* Tri-cameral CIP-1694 Progress Bars (DRep / SPO / CC) */}
                  <div className="p-3 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 space-y-2 text-[11px] tabular-nums">
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{isEn ? 'Community / DReps' : 'Cộng đồng / DReps'} ({p.yesVotes} Yes / {p.abstainVotes} Abstain / {p.noVotes} No)</span>
                        <span className="text-emerald-600">{p.drepYesPct}% Yes</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-paper-300 dark:bg-ink-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.drepYesPct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-ink-500 pt-0.5">
                      <span>{isEn ? 'Validators / SPOs:' : 'Validators / SPOs:'} <strong className="text-ink-800 dark:text-paper-200">{p.spoYesPct}%</strong></span>
                      <span>{isEn ? 'Review Council:' : 'Hội đồng Thẩm định:'} <strong className="text-[#146EBE]">{p.ccApproved}</strong></span>
                    </div>
                  </div>

                  {p.lastTxHash && (
                    <div className="text-[11px] flex flex-wrap items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <span className="font-semibold">
                        {p.lastVoteChoice ? `[${p.lastVoteChoice.toUpperCase()}] ` : ''}
                        {isEn ? 'On-chain Proof:' : 'Bằng chứng On-chain:'}
                      </span>
                      <a
                        href={p.lastExplorerUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono underline inline-flex items-center gap-0.5"
                      >
                        {p.lastTxHash.slice(0, 14)}... <ExternalLink className="w-3 h-3" />
                      </a>
                      {p.lastRationale && <span className="text-ink-500 italic">“{p.lastRationale}”</span>}
                    </div>
                  )}

                  {/* 3-Choice CIP-1694 Voting Buttons: Yes / Abstain / No */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={onChainBusy}
                      onClick={() => void handleCastVote(p.id, 'yes')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold"
                    >
                      {isEn ? `Yes (+${DAO_VOTE_BONUS_VNE} VNE)` : `Tán thành / Yes (+${DAO_VOTE_BONUS_VNE} VNE)`}
                    </button>
                    <button
                      type="button"
                      disabled={onChainBusy}
                      onClick={() => void handleCastVote(p.id, 'abstain')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold"
                    >
                      {isEn ? 'Abstain' : 'Phiếu trắng (Abstain)'}
                    </button>
                    <button
                      type="button"
                      disabled={onChainBusy}
                      onClick={() => void handleCastVote(p.id, 'no')}
                      className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-60 text-xs font-bold"
                    >
                      {isEn ? 'No' : 'Phản đối / No'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPropTitle.trim()) return;
                setOnChainBusy(true);
                try {
                  const proof = await runOnChainTestnetTx(`CIP1694_PROPOSE:${newPropType}`, '0x0');
                  const res = recordOnChainDaoProposal({
                    title: newPropTitle,
                    desc: newPropDesc,
                    actionType: newPropType,
                    network: proof.network,
                    txHash: proof.txHash,
                    explorerUrl: proof.explorerUrl,
                  });
                  setProposals(res.proposals);
                  if (res.ok) {
                    setNewPropTitle('');
                    setNewPropDesc('');
                  }
                  refreshPoints(res.ok, res.message);
                } catch (err) {
                  refreshPoints(false, err instanceof Error ? err.message : 'On-chain proposal cancelled.');
                } finally {
                  setOnChainBusy(false);
                }
              }}
              className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3"
            >
              <h3 className="font-serif text-base font-bold">
                {isEn
                  ? `Submit On-chain CIP-1694 Governance Action (Bonus +${DAO_PROPOSE_BONUS_VNE} VNE)`
                  : `Đệ trình Governance Action CIP-1694 On-chain (Thưởng Bonus +${DAO_PROPOSE_BONUS_VNE} VNE)`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as GovActionType)}
                  className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs font-semibold"
                >
                  <option value="economy">{actionTypeLabel('economy')}</option>
                  <option value="blockchain">{actionTypeLabel('blockchain')}</option>
                  <option value="society">{actionTypeLabel('society')}</option>
                  <option value="environment">{actionTypeLabel('environment')}</option>
                  <option value="governance">{actionTypeLabel('governance')}</option>
                </select>
                <input
                  required
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  placeholder={isEn ? 'Governance action title...' : 'Tiêu đề Governance Action...'}
                  className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs"
                />
                <input
                  value={newPropDesc}
                  onChange={(e) => setNewPropDesc(e.target.value)}
                  placeholder={isEn ? 'CIP-100 abstract / rationale...' : 'Tóm tắt mục tiêu CIP-100...'}
                  className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={onChainBusy}
                className="px-5 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                {onChainBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEn ? `Submit Action On-chain (+${DAO_PROPOSE_BONUS_VNE} VNE)` : `Gửi Governance Action On-chain (+${DAO_PROPOSE_BONUS_VNE} VNE)`}
              </button>
            </form>
              </div>
            </div>
          </section>
        );
      })()}

      {/* LAB 4: MARKETING ROI SIM */}
      {labSlug === 'marketing-sim' && (
        <section className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-5">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            {isEn ? 'Digital Marketing Budget & ROAS Simulator' : 'Đấu trường Phân bổ Ngân sách Marketing & ROAS'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 space-y-2">
              <div className="font-bold">SEO & Content: {seoBudget}%</div>
              <input type="range" min={10} max={70} value={seoBudget} onChange={(e) => setSeoBudget(Number(e.target.value))} className="w-full" />
            </div>
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 space-y-2">
              <div className="font-bold">Search & Social Ads: {adsBudget}%</div>
              <input type="range" min={10} max={70} value={adsBudget} onChange={(e) => setAdsBudget(Number(e.target.value))} className="w-full" />
            </div>
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 space-y-2">
              <div className="font-bold">KOL & Affiliate: {kolBudget}%</div>
              <input type="range" min={10} max={70} value={kolBudget} onChange={(e) => setKolBudget(Number(e.target.value))} className="w-full" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-amber-400/15 border border-amber-400/40">
            <div className="text-sm font-bold tabular-nums">
              {isEn ? 'Projected Campaign ROAS:' : 'ROAS Dự kiến:'} <span className="text-xl text-[#146EBE]">{estimatedRoas}x</span>
            </div>
            <button
              type="button"
              disabled={abBoost}
              onClick={() => {
                const res = spendVnePoints(15, 'Marketing A/B Testing Boost');
                if (!res.ok) return refreshPoints(false, res.message);
                setAbBoost(true);
                refreshPoints(true, isEn ? 'A/B Testing applied (+0.85x ROAS)!' : 'Đã chạy A/B Testing (+0.85x ROAS)!');
              }}
              className="px-4 py-2 rounded-xl bg-[#146EBE] disabled:bg-emerald-600 text-white text-xs font-bold"
            >
              {abBoost ? (isEn ? 'A/B Test Active ✓' : 'Đã bật A/B Test ✓') : isEn ? 'Run A/B Test (15 VNE)' : 'Chạy A/B Testing (15 VNE)'}
            </button>
          </div>
        </section>
      )}

      {/* LAB 5: AI & BIG DATA LAB */}
      {labSlug === 'ai-data-lab' && (
        <section className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-5">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-pink-500" />
            {isEn ? 'AI Agent & Big Data Pipeline Trainer' : 'Trung tâm Huấn luyện AI Agent & Dữ liệu lớn'}
          </h2>
          <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-ink-500">{isEn ? 'Model Forecast Accuracy' : 'Độ chính xác Mô hình Dự báo'}</div>
              <div className="text-2xl font-extrabold text-[#146EBE] tabular-nums flex items-center gap-2">
                <Cpu className="w-5 h-5" /> {dataCleaned ? '92.4% (Production Ready)' : '68.0% (Noisy Raw Data)'}
              </div>
            </div>
            <button
              type="button"
              disabled={dataCleaned}
              onClick={() => {
                const res = spendVnePoints(20, 'AI Data Cleaning & Labeling');
                if (!res.ok) return refreshPoints(false, res.message);
                setDataCleaned(true);
                refreshPoints(true, isEn ? 'Data cleaned & labeled! Accuracy boosted to 92.4%.' : 'Đã làm sạch & gán nhãn dữ liệu! Độ chính xác đạt 92.4%.');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#146EBE] disabled:bg-emerald-600 text-white text-xs font-bold"
            >
              {dataCleaned ? (isEn ? 'Dataset Cleaned ✓' : 'Đã làm sạch Dữ liệu ✓') : isEn ? 'Clean & Label Data (20 VNE)' : 'Làm sạch & Gán nhãn Dữ liệu (20 VNE)'}
            </button>
          </div>
        </section>
      )}

      {/* LAB 6: HOI DONG KHOA HOC */}
      {labSlug === 'hoi-dong-khoa-hoc' && (
        <section className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-5">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            {isEn ? 'Q1 Journal Peer-Review & Citation Council' : 'Hội đồng Công bố & Phản biện Học thuật (Q1)'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 space-y-3">
              <div className="text-sm font-bold">{isEn ? 'Step 1: APA 7 Citation Integrity Audit' : 'Bước 1: Kiểm định Trích dẫn APA 7'}</div>
              <button
                type="button"
                disabled={citationAudited}
                onClick={() => {
                  const res = spendVnePoints(15, 'APA 7 Citation Audit');
                  if (!res.ok) return refreshPoints(false, res.message);
                  setCitationAudited(true);
                  refreshPoints(true, isEn ? 'Citation Integrity verified (-15 VNE)!' : 'Đã kiểm định trích dẫn APA 7 (-15 VNE)!');
                }}
                className="px-4 py-2 rounded-xl bg-[#146EBE] disabled:bg-emerald-600 text-white text-xs font-bold"
              >
                {citationAudited ? (isEn ? 'Audited ✓' : 'Đã kiểm định ✓') : isEn ? 'Run Citation Audit (15 VNE)' : 'Kiểm định Trích dẫn (15 VNE)'}
              </button>
            </div>
            <div className="p-4 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 space-y-3">
              <div className="text-sm font-bold">{isEn ? 'Step 2: Pre-Submission Peer Review' : 'Bước 2: Phản biện Hội đồng Q1'}</div>
              <button
                type="button"
                disabled={peerReviewed}
                onClick={() => {
                  const res = spendVnePoints(25, 'Q1 Peer Review Council');
                  if (!res.ok) return refreshPoints(false, res.message);
                  setPeerReviewed(true);
                  claimPracticePoints(30, 'Accepted Q1 Manuscript Simulation');
                  refreshPoints(true, isEn ? 'Manuscript accepted! Earned +30 VNE research bonus.' : 'Bản thảo được chấp nhận! Thưởng +30 VNE nghiên cứu.');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 disabled:bg-emerald-600 text-ink-950 disabled:text-white text-xs font-bold"
              >
                {peerReviewed ? (isEn ? 'Accepted Q1 ✓' : 'Đã duyệt Q1 ✓') : isEn ? 'Submit to Council (25 VNE)' : 'Nộp Hội đồng Phản biện (25 VNE)'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
