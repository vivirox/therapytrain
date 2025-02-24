import * as React from 'react'
import { createInstance, InitOptions, i18n as I18nInterface } from 'i18next'
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export const defaultNS = 'common'
export const fallbackLng = 'en'
export const supportedLngs = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar']

interface I18nState {
  isLoading: boolean
  error: Error | null
  currentLanguage: string
  availableLanguages: string[]
}

interface I18nContextValue extends I18nState {
  changeLanguage: (lng: string) => Promise<void>
  reloadResources: (lng?: string, ns?: string | string[]) => Promise<void>
  t: (key: string, options?: any) => string
}

const I18nContext = React.createContext<I18nContextValue | undefined>(undefined)

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
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  }
}

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
  const [state, setState] = React.useState<I18nState>({
    isLoading: true,
    error: null,
    currentLanguage: locale || fallbackLng,
    availableLanguages: supportedLngs,
  })

  React.useEffect(() => {
    const init = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        await instance
          .use(initReactI18next)
          .use(LanguageDetector)
          .use(
            resourcesToBackend(
              (language: string, namespace: string) =>
                import(`./locales/${language}/${namespace}.json`)
                  .catch(error => {
                    console.error(`Failed to load translation: ${language}/${namespace}`, error)
                    return import(`./locales/${fallbackLng}/${namespace}.json`)
                  })
            )
          )
          .init(getOptions(locale, namespaces.join(',')))

        setState(prev => ({
          ...prev,
          isLoading: false,
          currentLanguage: instance.language,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to initialize i18n'),
        }))
      }
    }

    init()
  }, [instance, locale, namespaces])

  const changeLanguage = React.useCallback(
    async (lng: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        await instance.changeLanguage(lng)
        setState(prev => ({
          ...prev,
          isLoading: false,
          currentLanguage: lng,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to change language'),
        }))
      }
    },
    [instance]
  )

  const reloadResources = React.useCallback(
    async (lng?: string, ns?: string | string[]) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        await instance.reloadResources(lng, ns)
        setState(prev => ({ ...prev, isLoading: false }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to reload resources'),
        }))
      }
    },
    [instance]
  )

  const value = React.useMemo(
    () => ({
      ...state,
      changeLanguage,
      reloadResources,
      t: instance.t.bind(instance),
    }),
    [state, changeLanguage, reloadResources, instance]
  )

  if (state.error) {
    return (
      <div role="alert" className="i18n-error">
        <p>Failed to load translations: {state.error.message}</p>
        <button onClick={() => reloadResources()}>Retry</button>
      </div>
    )
  }

  return (
    <I18nContext.Provider value={value}>
      {state.isLoading ? (
        <div role="status" className="i18n-loading">
          Loading translations...
        </div>
      ) : (
        children
      )}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = React.useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
} 