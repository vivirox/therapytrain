import * as React from 'react'
import { createInstance, InitOptions } from 'i18next'
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export const defaultNS = 'common'
export const fallbackLng = 'en'
export const supportedLngs = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar']

export function getOptions(lng = fallbackLng, ns = defaultNS): InitOptions {
  return {
    supportedLngs,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
      caches: ['cookie'],
      cookieSameSite: 'strict',
    },
  }
}

const i18nInstance = createInstance()

i18nInstance
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init(getOptions())

export interface I18nProviderProps {
  children: React.ReactNode
  locale?: string
  namespaces?: string[]
}

export function I18nProvider({
  children,
  locale,
  namespaces = [defaultNS],
}: I18nProviderProps) {
  const [instance] = React.useState(() => createInstance())

  React.useEffect(() => {
    instance
      .use(initReactI18next)
      .use(LanguageDetector)
      .use(
        resourcesToBackend(
          (language: string, namespace: string) =>
            import(`./locales/${language}/${namespace}.json`)
        )
      )
      .init(getOptions(locale, namespaces.join(',')))
  }, [instance, locale, namespaces])

  return (
    <React.Suspense fallback="Loading translations...">
      {children}
    </React.Suspense>
  )
}

export function useTranslation() {
  return useI18nTranslation(defaultNS)
} 