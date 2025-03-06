import { z } from "zod";

// Session ID validation schema
export const sessionIdSchema = z
  .string()
  .uuid()
  .or(z.string().regex(/^[a-zA-Z0-9-_]{21}$/)); // For Supabase/Firebase style IDs

// Validate and sanitize session ID
export const validateSessionId = (sessionId: unknown): string => {
  const result = sessionIdSchema.safeParse(sessionId);
  if (!result.success) {
    throw new Error("Invalid session ID format");
  }
  return result.data;
};

// API path validation to prevent path traversal
export const validateApiPath = (path: string): string => {
  // Remove any path traversal attempts
  const sanitizedPath = path
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");

  // Only allow alphanumeric characters, hyphens, and forward slashes
  if (!/^[a-zA-Z0-9\/-]+$/.test(sanitizedPath)) {
    throw new Error("Invalid path format");
  }

  return sanitizedPath;
};

// Combine both validations for API routes
export const validateApiRoute = (path: string, sessionId: unknown): string => {
  const validSessionId = validateSessionId(sessionId);
  const validPath = validateApiPath(path);
  return `${validPath}/${validSessionId}`;
};
