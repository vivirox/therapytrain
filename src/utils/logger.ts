export class Logger {
  info(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    console.error(message, error, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(message, ...args);
  }
} 