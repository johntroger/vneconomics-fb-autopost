import React from 'react';
import { useTranslation } from '../../core/i18n/index.ts';
import { LeftSidebarShell, type SidebarNavGroup } from '../../core/ui/LeftSidebarShell.tsx';
import { SIM_MENU_ITEMS } from './simLabsService.ts';

interface SimSidebarLayoutProps {
  activeSlug: string;
  children: React.ReactNode;
}

export const SimSidebarLayout: React.FC<SimSidebarLayoutProps> = ({ activeSlug, children }) => {
  const { isEn } = useTranslation();

  const exchangeSlugs = new Set(['san-crypto', 'san-chung-khoan', 'san-hang-hoa', 'san-ngoai-hoi', 'san-tin-chi-carbon']);
  const overviewSlugs = new Set(['overview', 'testnet-swap', 'nft-hub']);

  const toItem = (m: (typeof SIM_MENU_ITEMS)[number]) => ({
    id: m.slug,
    to: m.to,
    title: isEn ? m.titleEn : m.titleVi,
    accentColor: m.accentColor,
    active: m.slug === activeSlug,
  });

  const groups: SidebarNavGroup[] = [
    {
      label: isEn ? 'Exchanges (*/VNE)' : '5 Sàn Giao dịch (*/VNE)',
      items: SIM_MENU_ITEMS.filter((m) => exchangeSlugs.has(m.slug)).map(toItem),
    },
    {
      label: isEn ? 'Labs & On-chain Web3' : 'Phòng Thí nghiệm & Web3',
      items: SIM_MENU_ITEMS.filter((m) => !exchangeSlugs.has(m.slug) && !overviewSlugs.has(m.slug)).map(toItem),
    },
    {
      label: isEn ? 'Wallet & Hub' : 'Ví Testnet & Trung tâm',
      items: SIM_MENU_ITEMS.filter((m) => overviewSlugs.has(m.slug)).map(toItem),
    },
  ];

  return (
    <LeftSidebarShell
      sidebarTitle={isEn ? 'Sim & Exchange Hub' : 'Danh mục Mô phỏng'}
      groups={groups}
    >
      {children}
    </LeftSidebarShell>
  );
};
