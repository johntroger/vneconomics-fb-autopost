import { useCallback, useEffect, useState } from 'react';
import {
  detectCardanoWallets,
  restoreCardanoWallet,
  restoreEvmWallet,
  subscribeEvmWalletEvents,
  type CardanoWalletState,
  type EvmWalletState,
} from './multiChainWalletService.ts';

const SESSION_KEY = 'vne_wallet_session_v1';

interface WalletSessionFlags {
  evm: boolean;
  cardanoId: string | null;
}

// Bộ nhớ dùng chung giữa các trang trong cùng phiên SPA (Sàn Dự báo, Cardano Hub, ...)
let sharedEvm: EvmWalletState | null = null;
let sharedCardano: CardanoWalletState | null = null;

function readFlags(): WalletSessionFlags {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return { evm: false, cardanoId: null, ...(JSON.parse(raw) as Partial<WalletSessionFlags>) };
  } catch {
    // Ignore
  }
  return { evm: false, cardanoId: null };
}

function writeFlags(patch: Partial<WalletSessionFlags>): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...readFlags(), ...patch }));
  } catch {
    // Ignore
  }
}

/**
 * Giữ trạng thái kết nối ví qua điều hướng/tải lại trang:
 * - Nhớ cờ "đã kết nối" trong localStorage (không lưu khóa hay dữ liệu nhạy cảm).
 * - Tự khôi phục im lặng (không popup) khi ví vẫn còn quyền truy cập.
 * - Cập nhật khi người dùng đổi tài khoản hoặc đổi mạng trong ví.
 */
export function useWalletSession() {
  const [evm, setEvmState] = useState<EvmWalletState | null>(sharedEvm);
  const [cardano, setCardanoState] = useState<CardanoWalletState | null>(sharedCardano);

  const setEvm = useCallback((state: EvmWalletState | null) => {
    sharedEvm = state;
    writeFlags({ evm: Boolean(state) });
    setEvmState(state);
  }, []);

  const setCardano = useCallback((state: CardanoWalletState | null) => {
    sharedCardano = state;
    writeFlags({ cardanoId: state ? state.walletId : null });
    setCardanoState(state);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const flags = readFlags();

    const refreshEvm = async () => {
      const next = await restoreEvmWallet();
      if (cancelled) return;
      sharedEvm = next;
      setEvmState(next);
      if (!next) writeFlags({ evm: false });
    };

    if (flags.evm) void refreshEvm();

    if (flags.cardanoId && detectCardanoWallets().includes(flags.cardanoId)) {
      void restoreCardanoWallet(flags.cardanoId).then((next) => {
        if (cancelled) return;
        sharedCardano = next;
        setCardanoState(next);
        if (!next) writeFlags({ cardanoId: null });
      });
    }

    const unsubscribe = subscribeEvmWalletEvents(() => {
      if (readFlags().evm) void refreshEvm();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { evm, cardano, setEvm, setCardano };
}
