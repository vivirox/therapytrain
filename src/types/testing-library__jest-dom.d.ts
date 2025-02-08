/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

declare module '@testing-library/jest-dom' {
  export {};
}

declare module '@testing-library/jest-dom/matchers' {
  export * from '@testing-library/jest-dom';
}

declare global {
  namespace jest {
    interface Matchers<R> extends TestingLibraryMatchers<R, any> {}
  }
}

interface TestingLibraryMatchers<R extends any, T = {}> {
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toBeEmpty(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toBeInvalid(): R;
  toBeRequired(): R;
  toBeValid(): R;
  toContainElement(element: HTMLElement | null): R;
  toContainHTML(htmlText: string): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(...classNames: string[]): R;
  toHaveFocus(): R;
  toHaveFormValues(expectedValues: { [key: string]: any }): R;
  toHaveStyle(css: string | object): R;
  toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
  toHaveValue(value?: string | string[] | number): R;
  toBeChecked(): R;
  toBePartiallyChecked(): R;
  toHaveDescription(text?: string | RegExp): R;
  toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
  toHaveErrorMessage(text?: string | RegExp): R;
} 