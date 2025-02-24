import * as React from 'react'

interface RTLContextType {
  isRTL: boolean
  setRTL: (isRTL: boolean) => void
}

const RTLContext = React.createContext<RTLContextType>({
  isRTL: false,
  setRTL: () => {},
})

const rtlLanguages = ['ar', 'fa', 'he', 'ur']

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const [isRTL, setRTL] = React.useState(false)

  React.useEffect(() => {
    const htmlDir = document.documentElement.dir
    const htmlLang = document.documentElement.lang
    setRTL(rtlLanguages.includes(htmlLang) || htmlDir === 'rtl')
  }, [])

  React.useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [isRTL])

  return (
    <RTLContext.Provider value={{ isRTL, setRTL }}>
      {children}
    </RTLContext.Provider>
  )
}

export const useRTL = () => React.useContext(RTLContext) 