import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CATALOG_EN_LOADED_EVENT, ensureEnglishCatalogLoaded } from '../data/catalogService.ts';
import {
  getLanguage,
  setLanguage as setLangService,
  subscribeLanguage,
  t as translate,
  toggleLanguage as toggleLangService,
  type SupportedLanguage,
} from './i18nService.ts';

interface LanguageContextValue {
  lang: SupportedLanguage;
  isVi: boolean;
  isEn: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => getLanguage());
  const [catalogRev, setCatalogRev] = useState(0);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (lang === 'en') {
      void ensureEnglishCatalogLoaded();
    }
    const onEnLoaded = () => setCatalogRev((r) => r + 1);
    window.addEventListener(CATALOG_EN_LOADED_EVENT, onEnLoaded);
    const unsub = subscribeLanguage((next) => setLangState(next));
    return () => {
      window.removeEventListener(CATALOG_EN_LOADED_EVENT, onEnLoaded);
      unsub();
    };
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isVi: lang === 'vi',
      isEn: lang === 'en',
      setLanguage: (next) => {
        if (next === 'en') void ensureEnglishCatalogLoaded();
        setLangState(setLangService(next));
      },
      toggleLanguage: () => {
        const next = toggleLangService();
        if (next === 'en') void ensureEnglishCatalogLoaded();
        setLangState(next);
      },
      t: (key, params, fallback) => translate(key, params, fallback),
    }),
    [lang, catalogRev],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  const [standaloneLang, setStandaloneLang] = useState<SupportedLanguage>(() => getLanguage());

  useEffect(() => {
    if (ctx) return;
    return subscribeLanguage((next) => setStandaloneLang(next));
  }, [ctx]);

  if (ctx) return ctx;

  return {
    lang: standaloneLang,
    isVi: standaloneLang === 'vi',
    isEn: standaloneLang === 'en',
    setLanguage: (next) => setStandaloneLang(setLangService(next)),
    toggleLanguage: () => setStandaloneLang(toggleLangService()),
    t: (key, params, fallback) => translate(key, params, fallback),
  };
}
