import { useEffect, useCallback, useRef } from "react";

type KeyHandler = (event: KeyboardEvent) => void;
type KeyMap = Record<string, KeyHandler>;

interface UseKeyboardOptions {
  global?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboard(
  keyMap: KeyMap,
  options: UseKeyboardOptions = {}
) {
  const { global = false, preventDefault = true, stopPropagation = true } = options;
  const keyMapRef = useRef(keyMap);
  keyMapRef.current = keyMap;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const handler = keyMapRef.current[key];

      if (handler) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        handler(event);
      }
    },
    [preventDefault, stopPropagation]
  );

  useEffect(() => {
    const target = global ? window : document;
    target.addEventListener("keydown", handleKeyDown);
    return () => target.removeEventListener("keydown", handleKeyDown);
  }, [global, handleKeyDown]);
}

export function useArrowNavigation<T extends HTMLElement>(
  itemRefs: React.RefObject<T>[],
  options: {
    loop?: boolean;
    vertical?: boolean;
    horizontal?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const {
    loop = true,
    vertical = true,
    horizontal = false,
    onSelect,
  } = options;

  const currentIndex = useRef(-1);

  const focusItem = useCallback(
    (index: number) => {
      if (index >= 0 && index < itemRefs.length) {
        const item = itemRefs[index].current;
        if (item) {
          item.focus();
          currentIndex.current = index;
          onSelect?.(index);
        }
      }
    },
    [itemRefs, onSelect]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key;
      let nextIndex = currentIndex.current;

      if (
        vertical &&
        (key === "ArrowUp" || key === "ArrowDown")
      ) {
        event.preventDefault();
        const direction = key === "ArrowUp" ? -1 : 1;
        nextIndex = currentIndex.current + direction;

        if (loop) {
          nextIndex = (nextIndex + itemRefs.length) % itemRefs.length;
        } else {
          nextIndex = Math.max(0, Math.min(nextIndex, itemRefs.length - 1));
        }

        focusItem(nextIndex);
      }

      if (
        horizontal &&
        (key === "ArrowLeft" || key === "ArrowRight")
      ) {
        event.preventDefault();
        const direction = key === "ArrowLeft" ? -1 : 1;
        nextIndex = currentIndex.current + direction;

        if (loop) {
          nextIndex = (nextIndex + itemRefs.length) % itemRefs.length;
        } else {
          nextIndex = Math.max(0, Math.min(nextIndex, itemRefs.length - 1));
        }

        focusItem(nextIndex);
      }

      if (key === "Enter" || key === " ") {
        event.preventDefault();
        onSelect?.(currentIndex.current);
      }
    },
    [vertical, horizontal, loop, itemRefs, focusItem, onSelect]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusItem,
    currentIndex: currentIndex.current,
  };
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    enabled?: boolean;
    autoFocus?: boolean;
  } = {}
) {
  const { enabled = true, autoFocus = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    if (autoFocus && firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [enabled, autoFocus, containerRef]);
}
