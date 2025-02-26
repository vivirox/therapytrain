import React, { createContext, useContext } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

interface I18nContextType {
  changeLanguage: (lang: string) => Promise<void>;
  currentLanguage: string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((language: string, namespace: string) => 
    import(`./locales/${language}/${namespace}.json`)
  ))
  .init({
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
  });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
  };

  return (
    <I18nContext.Provider value={{ changeLanguage, currentLanguage: i18n.language }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18nContext must be used within an I18nProvider');
  }
  return context;
}

export { useTranslation }; 