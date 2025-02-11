import * as React from 'react'
import { cn } from '@/lib/utils'
import { NavFocusRing } from './nav-focus-ring'
import { useFocusVisible } from '@/hooks/use-focus-visible'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className, children, ...props }, ref) => {
    const pathname = usePathname()
    const isActive = pathname === href
    const focusProps = useFocusVisible()
    
    return (
      <NavFocusRing active={isActive}>
        <Link
          ref={ref}
          href={href}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
            "transition-colors focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          {...props}
          {...focusProps}
        >
          {children}
        </Link>
      </NavFocusRing>
    )
  }
)

NavLink.displayName = "NavLink" 