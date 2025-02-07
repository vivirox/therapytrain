import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/button';
import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

interface PaginationProps {
    className?: string;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

interface PaginationLinkProps {
    children: React.ReactNode;
    'aria-label': string;
    size?: 'default' | 'sm' | 'lg';
    className?: string;
    onClick?: () => void;
}

const PaginationLink: React.FC<PaginationLinkProps> = ({
    children,
    'aria-label': ariaLabel,
    size = 'default',
    className,
    onClick
}) => (
    <Button
        variant="outline"
        size={size}
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
    >
        {children}
    </Button>
);

export function Pagination({
    className,
    currentPage,
    totalPages,
    onPageChange
}: PaginationProps): JSX.Element {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            className={className}
        >
            <div className="flex items-center space-x-2">
                <PaginationLink
                    aria-label="Go to previous page"
                    size="default"
                    className="gap-1 pl-2.5"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                </PaginationLink>
                <PaginationLink
                    aria-label="Go to next page"
                    size="default"
                    className="gap-1 pr-2.5"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                </PaginationLink>
            </div>
        </nav>
    );
}

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

const PaginationEllipsis: React.FC = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
};
