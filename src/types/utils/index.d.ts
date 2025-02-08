declare module '@/utils' {
  export * from '../common';
  
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  
  export type Nullable<T> = T | null;
  export type Optional<T> = T | undefined;
  
  export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;
  export type PromiseType<T> = T extends Promise<infer U> ? U : T;
} 