import * as z from "zod";

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  sessionId: z.string().uuid("Invalid session ID"),
});

export const sessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export const userSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  email: z.string().email("Invalid email address"),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
  theme: z.enum(["light", "dark", "system"]),
  language: z.string().min(2).max(10),
});

export type MessageFormData = z.infer<typeof messageSchema>;
export type SessionFormData = z.infer<typeof sessionSchema>;
export type UserSettingsFormData = z.infer<typeof userSettingsSchema>;
