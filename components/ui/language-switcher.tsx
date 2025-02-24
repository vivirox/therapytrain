import * as React from 'react'
import { useTranslation } from '../../lib/i18n/i18n-context'
import { supportedLngs } from '../../lib/i18n/i18n-context'
import { useRTL } from '../../lib/i18n/rtl-context'
import { Select } from '../ui/select'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { setRTL } = useRTL()

  const handleLanguageChange = (newLang: string) => {
    i18n.changeLanguage(newLang)
    setRTL(['ar', 'fa', 'he', 'ur'].includes(newLang))
  }

  return (
    <Select
      value={i18n.language}
      onValueChange={handleLanguageChange}
      aria-label="Select language"
    >
      {supportedLngs.map((lng) => (
        <Select.Option key={lng} value={lng}>
          {new Intl.DisplayNames([lng], { type: 'language' }).of(lng)}
        </Select.Option>
      ))}
    </Select>
  )
} 