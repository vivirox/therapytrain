/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
}

declare module '@mdx-js/react' {
  import { ComponentType, ReactNode } from 'react'

  export interface MDXProviderProps {
    children: ReactNode
    components?: Record<string, ComponentType>
  }

  export const MDXProvider: ComponentType<MDXProviderProps>
} 