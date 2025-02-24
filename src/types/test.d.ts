declare module 'vitest' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: any;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const vi: {
    fn: <T extends (...args: any[]) => any>(implementation?: T) => jest.Mock<ReturnType<T>, Parameters<T>>;
    mock: (moduleName: string, factory?: () => any) => void;
    clearAllMocks: () => void;
    resetModules: () => void;
    mocked: <T>(item: T, deep?: boolean) => jest.Mocked<T>;
  };
}

declare module 'mjml' {
  interface MJMLParsingOptions {
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: 'strict' | 'soft' | 'skip';
    filePath?: string;
  }

  interface MJMLParseError {
    line: number;
    message: string;
    tagName?: string;
    formattedMessage?: string;
  }

  interface MJMLParseResults {
    html: string;
    errors: MJMLParseError[];
  }

  export default function mjml2html(
    mjml: string,
    options?: MJMLParsingOptions
  ): MJMLParseResults;
} 