import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${path}`
}

export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function isServer(): boolean {
  return typeof window === "undefined"
}

export function isClient(): boolean {
  return !isServer()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) {
    return str
  }
  return str.slice(0, length) + "..."
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc: any, _: any, i: any) => {
    if (i % size === 0) {
      acc.push(array.slice(i, i + size))
    }
    return acc
  }, [] as T[][])
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc: any, item: any) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1
    return 0
  })
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc: any, key: any) => {
    if (key in obj) {
      acc[key] = obj[key]
    }
    return acc
  }, {} as Pick<T, K>)
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((key: any) => delete result[key])
  return result
}
