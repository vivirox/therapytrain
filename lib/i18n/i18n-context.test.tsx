import * as React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { I18nProvider, useTranslation } from './i18n-context'

const TestComponent = () => {
  const { t } = useTranslation()
  return <div>{t('common.loading')}</div>
}

describe('I18nProvider', () => {
  it('should render with default locale', () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should change locale', async () => {
    render(
      <I18nProvider locale="es">
        <TestComponent />
      </I18nProvider>
    )
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })
}) 