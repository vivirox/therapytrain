import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useFocusable } from "@/contexts/keyboard-navigation";
import NextLink from "next/link";

const linkVariants = cva(
  "inline-flex items-center justify-center text-sm transition-colors",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/80",
        muted: "text-muted-foreground hover:text-foreground",
        destructive: "text-destructive hover:text-destructive/80",
      },
      underline: {
        default: "underline-offset-4 hover:underline",
        none: "no-underline",
        always: "underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: "default",
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  href: string;
  external?: boolean;
  asChild?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ 
    className, 
    variant, 
    underline, 
    href,
    external,
    children,
    onClick,
    ...props 
  }, ref) => {
    const linkRef = useFocusable(0, 'link');
    const { announce } = useAccessibility();

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLAnchorElement | null) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        if (linkRef) linkRef.current = node;
      },
      [ref, linkRef]
    );

    // Handle click events for screen reader announcements
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (external) {
        announce('Opening in new tab', 'polite');
      }
      
      if (onClick) {
        onClick(event);
      }
    };

    const linkProps = {
      ref: combinedRef,
      className: cn(
        linkVariants({ variant, underline, className }),
        "focus-visible-ring",
        "high-contrast-link",
        "reduced-motion-safe"
      ),
      onClick: handleClick,
      ...props,
    };

    if (external) {
      return (
        <a 
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...linkProps}
        >
          {children}
          <span className="sr-only">(opens in new tab)</span>
        </a>
      );
    }

    return (
      <NextLink href={href} {...linkProps}>
        {children}
      </NextLink>
    );
  }
);
Link.displayName = "Link";

export { Link, linkVariants };

// Add type assertion to fix JSX element type error
export default Link as React.FC<LinkProps>;

// Add type declaration to fix JSX element type error
declare module 'react' {
  interface JSX {
    IntrinsicElements: {
      a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>
    }
  }
} 