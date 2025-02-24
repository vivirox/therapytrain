import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useAccessibility } from "@/contexts/accessibility-context"
import { useFocusable } from "@/contexts/keyboard-navigation"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const buttonRef = useFocusable(0, 'button')
    const { announce } = useAccessibility()

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        if (buttonRef) buttonRef.current = node
      },
      [ref, buttonRef]
    )

    // Handle press events for screen reader announcements
    const handlePress = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (props.disabled) {
        event.preventDefault()
        announce('Button is disabled', 'polite')
        return
      }
      
      if (props.onClick) {
        props.onClick(event)
      }
    }

    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={combinedRef}
        className={cn(
          buttonVariants({ variant, size, className }),
          "focus-visible-ring",
          "high-contrast-text",
          "reduced-motion-safe",
          variant === 'link' && "high-contrast-link",
          variant === 'ghost' && "high-contrast-button",
          variant === 'outline' && "high-contrast-button"
        )}
        onClick={handlePress}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

// Add type assertion to fix JSX element type error
export default Button as React.FC<ButtonProps>

// Add type declaration to fix JSX element type error
declare module 'react' {
  interface JSX {
    IntrinsicElements: {
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
    }
  }
}
