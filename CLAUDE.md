# Gradiant Project Commands and Style Guide

## Build/Test/Lint Commands

- Build: `pnpm build`
- Dev server: `pnpm dev`
- Type check: `pnpm tsc` or `pnpm type-check`
- Lint: `pnpm lint`
- Tests: `pnpm test` (all), `pnpm test path/to/test.ts` (single test), `pnpm test:watch`
- Test coverage: `pnpm test:coverage`
- Test UI: `pnpm test:ui`
- E2E tests: `pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:e2e:debug`
- ZK setup: `pnpm setup:zk`
- Fix TypeScript issues: `pnpm ts:fix`
- Migration: `pnpm ts:migrate` (combines check-strict and fix scripts)
- Installing dependencies: `pnpm install` (requires pnpm v10+)
- Performance profiling: `pnpm run scripts/performance-profile.ts`

## Code Style Guidelines

- Use TypeScript with strict type checking; prefer interfaces over types
- Use functional, declarative programming; avoid classes except for Singleton services
- Use "function" keyword for pure functions; omit semicolons
- Variable naming: Use descriptive names with auxiliary verbs (e.g., isLoading)
- Directory naming: Lowercase with dashes (e.g., components/auth-wizard)
- Favor named exports for components and use path aliases (@/components, @/services)
- Error handling: Handle errors early with guard clauses; use custom error types
- Component structure: Organize exports, components, helpers, static content, types
- React style: Minimize 'use client', useEffect, useState; favor Server Components
- Follow mobile-first approach with Tailwind CSS for responsive designs
- For forms: Use Zod for validation; use useActionState with react-hook-form
- Security: Never commit secrets or log sensitive data; use secure channels
- Services: Use Singleton pattern with getInstance() method for shared services
- Testing: Create proper test environment with .env.test configuration
- Performance: Optimize Web Vitals (LCP, CLS, FID) and client bundle size
- Documentation: Add JSDoc comments for public APIs and complex functions
