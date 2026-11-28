import React from 'react';
import { Link } from 'react-router-dom';
import { getLocalizedPillar, TOPIC_PILLARS } from '../config/pillars.ts';
import { useTranslation } from '../i18n/index.ts';

export const Footer: React.FC = () => {
  const { lang, isEn, t } = useTranslation();

  return (
    <footer className="border-t border-paper-300 dark:border-ink-800 bg-paper-200/60 dark:bg-ink-900/50 mt-16 pb-20 md:pb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-vneconomics.png"
              alt="Logo VNEconomics"
              className="h-9 w-9 object-contain rounded-lg bg-white p-0.5 border border-paper-300 dark:border-ink-700"
            />
            <span className="font-serif font-bold text-xl text-ink-950 dark:text-paper-50">
              VNEconomics
            </span>
          </div>
          <p className="text-ink-600 dark:text-ink-400 leading-relaxed text-xs">
            {t('footer.brandDesc')}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-ink-900 dark:text-paper-100 mb-3">{t('footer.pillarsHeading')}</h3>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-400">
            {TOPIC_PILLARS.map((p) => {
              const loc = getLocalizedPillar(p, lang);
              return (
                <li key={p.slug}>
                  <Link to={`/${p.slug}/`} className="hover:text-editorial-teal transition-colors">
                    {loc.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-ink-900 dark:text-paper-100 mb-3">{t('footer.ecosystemHeading')}</h3>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-400">
            <li><Link to="/thi-truong/" className="hover:text-editorial-teal">{t('footer.marketData')}</Link></li>
            <li><Link to="/tin-quoc-te/" className="hover:text-editorial-teal">{isEn ? 'International News Wire' : 'Tin Quốc tế (PR Newswire)'}</Link></li>
            <li><Link to="/thu-vien-sach/" className="hover:text-editorial-teal">{t('footer.libraryLink')}</Link></li>
            <li><Link to="/hoc-vien/" className="hover:text-editorial-teal">{t('footer.academyLink')}</Link></li>
            <li><Link to="/tu-dien/" className="hover:text-editorial-teal">{t('footer.glossaryLink')}</Link></li>
            <li><Link to="/cardano-hub/" className="hover:text-editorial-teal">{t('footer.cardanoLink')}</Link></li>
            <li><Link to="/drep/" className="hover:text-editorial-teal">{isEn ? 'Cardano dRep Portal' : 'Cổng Quản trị dRep'}</Link></li>
            <li><Link to="/giao-duc-mo/" className="hover:text-editorial-teal">{isEn ? 'Open Education (OER)' : 'Giáo dục Mở (OER)'}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-ink-900 dark:text-paper-100 mb-3">{t('footer.complianceHeading')}</h3>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-400">
            <li><Link to="/ve-chung-toi/" className="hover:text-editorial-teal">{isEn ? 'About VNEconomics' : 'Về VNEconomics'}</Link></li>
            <li><Link to="/contact/" className="hover:text-editorial-teal">{isEn ? 'Contact & Faculty' : 'Liên hệ'}</Link></li>
            <li><Link to="/hop-tac-dang-bai/" className="hover:text-editorial-teal">{isEn ? 'Guest Publishing' : 'Hợp tác đăng bài'}</Link></li>
            <li><a href="/llms.txt" className="hover:text-editorial-teal">GEO Knowledge Map (/llms.txt)</a></li>
            <li><a href="/sitemap_index.xml" className="hover:text-editorial-teal">XML Sitemap Index</a></li>
            <li><Link to="/learn-and-earn/" className="hover:text-editorial-teal">{t('footer.simLink')}</Link></li>
            <li><Link to="/privacy-and-cookie-policy/" className="hover:text-editorial-teal">{t('footer.privacyLink')}</Link></li>
            <li><Link to="/terms-of-use/" className="hover:text-editorial-teal">{t('footer.termsLink')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper-300 dark:border-ink-800 py-4 text-center text-xs text-ink-500 dark:text-ink-400">
        © {new Date().getFullYear()} {t('footer.copyright')}
      </div>
    </footer>
  );
};
