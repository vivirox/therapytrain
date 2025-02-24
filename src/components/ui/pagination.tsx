import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/contexts/accessibility-context";
import { useKeyboardNavigation, useFocusable } from "@/contexts/keyboard-navigation";
import { Button } from "./button";

export interface PaginationProps {
  className?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  'aria-label'?: string;
}

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(({
  className,
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  'aria-label': ariaLabel = 'Pagination',
  ...props
}, ref) => {
  const { announce } = useAccessibility();
  const { shortcuts } = useAccessibility();
  const navRef = useFocusable(0, 'pagination');

  // Combine refs
  const combinedRef = React.useCallback(
    (node: HTMLElement | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (navRef) navRef.current = node;
    },
    [ref, navRef]
  );

  // Register keyboard shortcuts
  React.useEffect(() => {
    shortcuts.register('Alt+ArrowLeft', () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
        announce(`Navigated to page ${currentPage - 1}`, 'polite');
      }
    });

    shortcuts.register('Alt+ArrowRight', () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
        announce(`Navigated to page ${currentPage + 1}`, 'polite');
      }
    });

    return () => {
      shortcuts.unregister('Alt+ArrowLeft');
      shortcuts.unregister('Alt+ArrowRight');
    };
  }, [shortcuts, currentPage, totalPages, onPageChange, announce]);

  // Generate page numbers
  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  const generatePaginationItems = () => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + first + current + last
    const totalBlocks = totalNumbers + 2; // totalNumbers + 2 dots

    if (totalPages <= totalBlocks) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      return [...range(1, leftItemCount), -1, totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      return [1, -1, ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    return [
      1,
      -1,
      ...range(leftSiblingIndex, rightSiblingIndex),
      -2,
      totalPages,
    ];
  };

  const items = generatePaginationItems();

  return (
    <nav
      ref={combinedRef}
      aria-label={ariaLabel}
      className={cn(
        "mx-auto flex w-full justify-center",
        "focus-visible-within",
        "reduced-motion-safe",
        className
      )}
      {...props}
    >
      <ul className="flex items-center gap-1">
        <li>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8",
              "focus-visible-ring",
              "high-contrast-button",
              "reduced-motion-safe"
            )}
            disabled={currentPage === 1}
            onClick={() => {
              onPageChange(currentPage - 1);
              announce(`Navigated to page ${currentPage - 1}`, 'polite');
            }}
            aria-label="Previous page"
            ref={useFocusable(1, 'pagination')}
          >
            <ChevronLeft className="h-4 w-4 high-contrast-icon" />
          </Button>
        </li>
        {items.map((page, index) => {
          if (page < 0) {
            return (
              <li key={index} role="presentation">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center",
                    "high-contrast-text"
                  )}
                  aria-hidden="true"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              </li>
            );
          }

          return (
            <li key={index}>
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-8 w-8",
                  "focus-visible-ring",
                  "high-contrast-button",
                  "reduced-motion-safe"
                )}
                onClick={() => {
                  onPageChange(page);
                  announce(`Navigated to page ${page}`, 'polite');
                }}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
                ref={useFocusable(index + 2, 'pagination')}
              >
                {page}
              </Button>
            </li>
          );
        })}
        <li>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8",
              "focus-visible-ring",
              "high-contrast-button",
              "reduced-motion-safe"
            )}
            disabled={currentPage === totalPages}
            onClick={() => {
              onPageChange(currentPage + 1);
              announce(`Navigated to page ${currentPage + 1}`, 'polite');
            }}
            aria-label="Next page"
            ref={useFocusable(items.length + 2, 'pagination')}
          >
            <ChevronRight className="h-4 w-4 high-contrast-icon" />
          </Button>
        </li>
      </ul>
    </nav>
  );
});
Pagination.displayName = "Pagination";

export { Pagination };
