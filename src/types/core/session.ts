import type { Database } from "../database.types";
import type { UserProfile } from "./user";

// Session status
export enum SessionStatus {
  ACTIVE = "active",
  ENDED = "ended",
  PAUSED = "paused",
  SCHEDULED = "scheduled",
}

// Session type
export enum SessionType {
  INDIVIDUAL = "individual",
  GROUP = "group",
  WORKSHOP = "workshop",
  ASSESSMENT = "assessment",
}

export interface SessionBase {
  id: string;
  title: string;
  description: string;
  mode: string;
  status: string;
  startTime: string;
  endTime: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends SessionBase {
  participants: SessionParticipant[];
  messages: SessionMessage[];
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  user: UserProfile;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  metadata: Record<string, unknown>;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export type SessionMessageRow =
  Database["public"]["Tables"]["session_messages"]["Row"];
export type SessionMessageInsert =
  Database["public"]["Tables"]["session_messages"]["Insert"];
export type SessionMessageUpdate =
  Database["public"]["Tables"]["session_messages"]["Update"];

export type SessionParticipantRow =
  Database["public"]["Tables"]["session_participants"]["Row"];
export type SessionParticipantInsert =
  Database["public"]["Tables"]["session_participants"]["Insert"];
export type SessionParticipantUpdate =
  Database["public"]["Tables"]["session_participants"]["Update"];

export interface SessionWithParticipants extends Session {
  participants: SessionParticipant[];
}

// Session creation data
export interface SessionCreate {
  type: SessionType;
  therapist_id: string;
  client_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}
// Session update data
export interface SessionUpdateData {
  status?: SessionStatus;
  end_time?: string;
  duration?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Type guard for Session
export function isSession(obj: unknown): obj is Session {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "type" in obj &&
    "status" in obj &&
    "therapist_id" in obj &&
    "client_id" in obj
  );
}

// Type guard for SessionMessage
export function isSessionMessage(obj: unknown): obj is SessionMessage {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "session_id" in obj &&
    "sender_id" in obj &&
    "content" in obj
  );
}
