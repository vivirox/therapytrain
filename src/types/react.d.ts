import 'react';

declare module 'react' {
  // Extend React's JSX namespace without redefining LibraryManagedAttributes
  namespace JSX {
    interface IntrinsicElements {
      // Add any custom elements here if needed
    }
  }
} 