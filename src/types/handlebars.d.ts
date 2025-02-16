declare module 'handlebars' {
  export interface HelperOptions {
    name: string;
    hash: any;
    data: any;
    fn: (context: any) => string;
    inverse: (context: any) => string;
  }

  export type HelperDelegate = (
    context: any,
    options?: HelperOptions
  ) => string | undefined | null | boolean;

  export interface TemplateDelegate<T = any> {
    (context: T, options?: RuntimeOptions): string;
  }

  export interface RuntimeOptions {
    data?: any;
    helpers?: { [name: string]: HelperDelegate };
    partials?: { [name: string]: HandlebarsTemplateDelegate };
    decorators?: { [name: string]: HandlebarsTemplateDelegate };
  }

  export interface CompileOptions {
    data?: boolean;
    compat?: boolean;
    knownHelpers?: {
      [name: string]: boolean;
    };
    knownHelpersOnly?: boolean;
    noEscape?: boolean;
    strict?: boolean;
    assumeObjects?: boolean;
    preventIndent?: boolean;
    ignoreStandalone?: boolean;
    explicitPartialContext?: boolean;
  }

  export function registerHelper(name: string, helper: HelperDelegate): void;
  export function registerHelper(helpers: { [name: string]: HelperDelegate }): void;
  export function unregisterHelper(name: string): void;

  export function registerPartial(name: string, partial: string): void;
  export function registerPartial(partials: { [name: string]: string }): void;
  export function unregisterPartial(name: string): void;

  export function compile<T = any>(
    input: string,
    options?: CompileOptions
  ): TemplateDelegate<T>;
  
  export function SafeString(str: string): { toString(): string };

  export default {
    registerHelper,
    unregisterHelper,
    registerPartial,
    unregisterPartial,
    compile,
    SafeString,
  };
} 