import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAccessibility } from './accessibility-context';

interface FocusableElement extends HTMLElement {
  dataset: {
    focusOrder?: string;
    focusGroup?: string;
  };
}

interface KeyboardNavigationContextType {
  registerFocusable: (element: FocusableElement, order?: number, group?: string) => void;
  unregisterFocusable: (element: FocusableElement) => void;
  setFocusGroup: (groupName: string) => void;
  moveFocus: (direction: 'next' | 'prev' | 'first' | 'last') => void;
  currentFocusGroup: string | null;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | undefined>(undefined);

export function KeyboardNavigationProvider({ children }: { children: React.ReactNode }) {
  const { focusTrap } = useAccessibility();
  const [currentFocusGroup, setCurrentFocusGroupState] = useState<string | null>(null);
  const focusableElements = useRef<Map<string, FocusableElement[]>>(new Map());
  
  const setFocusGroup = useCallback((groupName: string) => {
    setCurrentFocusGroupState(groupName);
  }, []);

  // Register a focusable element with optional order and group
  const registerFocusable = useCallback((element: FocusableElement, order?: number, group: string = 'default') => {
    if (!focusableElements.current.has(group)) {
      focusableElements.current.set(group, []);
    }
    
    const elements = focusableElements.current.get(group)!;
    element.dataset.focusOrder = order?.toString() || elements.length.toString();
    element.dataset.focusGroup = group;
    elements.push(element);
    
    // Sort elements by focus order
    elements.sort((a, b) => {
      const orderA = parseInt(a.dataset.focusOrder || '0', 10);
      const orderB = parseInt(b.dataset.focusOrder || '0', 10);
      return orderA - orderB;
    });
  }, []);

  // Unregister a focusable element
  const unregisterFocusable = useCallback((element: FocusableElement) => {
    const group = element.dataset.focusGroup || 'default';
    if (focusableElements.current.has(group)) {
      const elements = focusableElements.current.get(group)!;
      const index = elements.indexOf(element);
      if (index !== -1) {
        elements.splice(index, 1);
      }
    }
  }, []);

  // Move focus in a specified direction within the current group
  const moveFocus = useCallback((direction: 'next' | 'prev' | 'first' | 'last') => {
    if (!currentFocusGroup || !focusableElements.current.has(currentFocusGroup)) return;

    const elements = focusableElements.current.get(currentFocusGroup)!;
    if (elements.length === 0) return;

    const currentFocusIndex = elements.findIndex(el => el === document.activeElement);
    let nextIndex: number;

    switch (direction) {
      case 'next':
        nextIndex = currentFocusIndex < elements.length - 1 ? currentFocusIndex + 1 : 0;
        break;
      case 'prev':
        nextIndex = currentFocusIndex > 0 ? currentFocusIndex - 1 : elements.length - 1;
        break;
      case 'first':
        nextIndex = 0;
        break;
      case 'last':
        nextIndex = elements.length - 1;
        break;
      default:
        return;
    }

    elements[nextIndex].focus();
  }, [currentFocusGroup]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentFocusGroup || focusTrap.active) return;

      switch (event.key) {
        case 'Tab':
          if (event.shiftKey) {
            moveFocus('prev');
          } else {
            moveFocus('next');
          }
          event.preventDefault();
          break;
        case 'Home':
          if (event.ctrlKey) {
            moveFocus('first');
            event.preventDefault();
          }
          break;
        case 'End':
          if (event.ctrlKey) {
            moveFocus('last');
            event.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFocusGroup, focusTrap.active, moveFocus]);

  const value = {
    registerFocusable,
    unregisterFocusable,
    setFocusGroup,
    moveFocus,
    currentFocusGroup,
  };

  return (
    <KeyboardNavigationContext.Provider value={value}>
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

export function useKeyboardNavigation() {
  const context = useContext(KeyboardNavigationContext);
  if (context === undefined) {
    throw new Error('useKeyboardNavigation must be used within a KeyboardNavigationProvider');
  }
  return context;
}

// Hook to make an element focusable and part of keyboard navigation
export function useFocusable(order?: number, group?: string) {
  const { registerFocusable, unregisterFocusable } = useKeyboardNavigation();
  const elementRef = useRef<FocusableElement | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      registerFocusable(elementRef.current, order, group);
      return () => {
        if (elementRef.current) {
          unregisterFocusable(elementRef.current);
        }
      };
    }
  }, [order, group, registerFocusable, unregisterFocusable]);

  return elementRef;
} 