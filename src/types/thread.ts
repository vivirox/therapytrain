import { BaseEntity, Metadata } from './common';
import { UserProfile } from './user';

export type ThreadStatus = 'active' | 'archived' | 'pinned' | 'hidden';

export interface ThreadHierarchy extends BaseEntity {
  parent_id?: string;
  thread_id: string;
  position: number;
  path: string;
  depth: number;
}

export interface ThreadMetadata extends BaseEntity {
  thread_id: string;
  title?: string;
  description?: string;
  status: ThreadStatus;
  color?: string;
  icon?: string;
  custom_properties?: Record<string, unknown>;
  last_activity_at: string;
}

export interface ThreadGroup extends BaseEntity {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  position: number;
  created_by: string;
}

export interface ThreadGroupMember extends BaseEntity {
  group_id: string;
  thread_id: string;
  position: number;
  added_by: string;
}

export interface ThreadState extends BaseEntity {
  thread_id: string;
  user_id: string;
  is_muted: boolean;
  is_favorite: boolean;
  custom_state?: Record<string, unknown>;
  last_read_at?: string;
  notification_preferences?: {
    mute_until?: string;
    desktop_notifications?: boolean;
    mobile_notifications?: boolean;
    email_notifications?: boolean;
    notification_sound?: string;
  };
}

export interface ThreadAuditLog extends BaseEntity {
  thread_id: string;
  user_id: string;
  action: string;
  metadata?: {
    table: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ThreadWithMetadata {
  id: string;
  metadata: ThreadMetadata;
  hierarchy?: ThreadHierarchy;
  state?: ThreadState;
  groups?: ThreadGroup[];
  participants: Array<{
    user: UserProfile;
    role: 'therapist' | 'client';
  }>;
  unread_count: number;
  last_message?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  };
}

export interface ThreadManager {
  getThread: (threadId: string) => Promise<ThreadWithMetadata>;
  
  getThreads: (options?: {
    status?: ThreadStatus[];
    groupId?: string;
    parentId?: string;
    includeArchived?: boolean;
  }) => Promise<ThreadWithMetadata[]>;

  createThread: (data: {
    title?: string;
    description?: string;
    parentId?: string;
    participants: Array<{
      userId: string;
      role: 'therapist' | 'client';
    }>;
  }) => Promise<ThreadWithMetadata>;

  updateThread: (threadId: string, data: {
    title?: string;
    description?: string;
    status?: ThreadStatus;
    color?: string;
    icon?: string;
    custom_properties?: Record<string, unknown>;
  }) => Promise<ThreadWithMetadata>;

  moveThread: (threadId: string, data: {
    parentId?: string;
    position: number;
  }) => Promise<void>;

  archiveThread: (threadId: string) => Promise<void>;

  pinThread: (threadId: string) => Promise<void>;

  updateThreadState: (threadId: string, data: {
    is_muted?: boolean;
    is_favorite?: boolean;
    custom_state?: Record<string, unknown>;
    notification_preferences?: ThreadState['notification_preferences'];
  }) => Promise<ThreadState>;

  createGroup: (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    position: number;
  }) => Promise<ThreadGroup>;

  updateGroup: (groupId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    position?: number;
  }) => Promise<ThreadGroup>;

  addThreadToGroup: (groupId: string, threadId: string, position: number) => Promise<void>;

  removeThreadFromGroup: (groupId: string, threadId: string) => Promise<void>;

  reorderGroup: (groupId: string, threadIds: string[]) => Promise<void>;

  getThreadAuditLogs: (threadId: string, options?: {
    limit?: number;
    before?: string;
  }) => Promise<ThreadAuditLog[]>;
} 