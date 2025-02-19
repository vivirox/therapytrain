import '@testing-library/jest-dom';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { vi } from 'vitest';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Create a wrapper with form context for testing form components
export function FormWrapper({ children, defaultValues = {} }: any) {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

// Custom render function with default providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { wrapWithForm?: boolean }
) => {
  const { wrapWithForm, ...renderOptions } = options || {};
  const Wrapper = wrapWithForm ? FormWrapper : undefined;
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render }; 