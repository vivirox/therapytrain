import React, { useEffect, useRef } from 'react';
import { addPassiveEventListener, removePassiveEventListener } from '@/utils/eventUtils';

export const VercelFeedbackWrapper: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remove aria-hidden from Vercel feedback element when it's added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'vercel-live-feedback') {
              node.removeAttribute('aria-hidden');
              
              // Add passive event listeners to all touchstart events
              const touchElements = node.querySelectorAll('*');
              touchElements.forEach((el) => {
                if (el instanceof HTMLElement) {
                  const existingTouchStart = el.ontouchstart;
                  if (existingTouchStart) {
                    el.ontouchstart = null;
                    addPassiveEventListener(el, 'touchstart', existingTouchStart as EventListener);
                  }
                }
              });

              // Use inert instead of aria-hidden for elements that should be hidden from a11y tree
              const nonInteractiveElements = node.querySelectorAll('[aria-hidden="true"]');
              nonInteractiveElements.forEach((el) => {
                if (el instanceof HTMLElement) {
                  el.removeAttribute('aria-hidden');
                  el.setAttribute('inert', '');
                }
              });
            }
          });
        }
      });
    });

    if (wrapperRef.current) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

  return <div ref={wrapperRef} className="vercel-feedback-wrapper" />;
}; 