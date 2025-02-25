export function handleReducedMotion(element: HTMLElement | null) {
  if (!element) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const userReducedMotion = document.documentElement.getAttribute('data-reduced-motion') === 'true';

  if (prefersReducedMotion || userReducedMotion) {
    element.classList.add('no-motion');
  } else {
    element.classList.remove('no-motion');
  }
}

export function setupReducedMotionListener(element: HTMLElement | null) {
  if (!element) return;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  // Initial setup
  handleReducedMotion(element);

  // Listen for changes
  mediaQuery.addEventListener('change', () => handleReducedMotion(element));

  // Clean up function
  return () => {
    mediaQuery.removeEventListener('change', () => handleReducedMotion(element));
  };
}

// Optional: Setup a global reduced motion observer
export function setupGlobalReducedMotionObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-reduced-motion') {
        document.querySelectorAll('.focus-visible-ring, .focus-visible-within, .focus-visible-before, .focus-visible-after')
          .forEach(element => handleReducedMotion(element as HTMLElement));
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-reduced-motion']
  });

  return observer;
} 