import { MDXProvider } from '@mdx-js/react'
import { Card } from './ui/card'
import { ProgressBar } from './ui/progress-bar'
import { Checkbox } from './ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

const components = {
  Card,
  ProgressBar,
  Checkbox,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  // Add any other components you want to use in MDX files
}

export function MDXProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MDXProvider components={components}>
      {children}
    </MDXProvider>
  )
} 