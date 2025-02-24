import { BaseEntity, Metadata } from './common';

export type AttachmentType = 'document' | 'image' | 'audio' | 'video' | 'other';

export type AttachmentStatus = 
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'deleted';

export interface Attachment extends BaseEntity {
  thread_id: string;
  message_id?: string;
  uploader_id: string;
  file_name: string;
  file_type: AttachmentType;
  mime_type: string;
  size_bytes: number;
  status: AttachmentStatus;
  encryption_key_version: string;
  encryption_key_id?: string;
  encryption_metadata?: {
    algorithm: string;
    key_derivation?: {
      method: string;
      parameters: Record<string, unknown>;
    };
    iv: string;
    tag?: string;
    additional_data?: Record<string, unknown>;
  };
  storage_path: string;
  content_hash: string;
  virus_scan_status?: string;
  virus_scan_result?: {
    scanned_at: string;
    clean: boolean;
    threats?: string[];
    scanner_info?: Record<string, unknown>;
  };
  preview_status?: string;
  preview_metadata?: {
    type: string;
    dimensions?: {
      width: number;
      height: number;
    };
    thumbnail_path?: string;
    processing_info?: Record<string, unknown>;
  };
  version: number;
  is_latest: boolean;
  previous_version_id?: string;
  metadata?: Metadata;
  retention_policy?: {
    expires_at?: string;
    auto_delete?: boolean;
    min_retention_days?: number;
    max_retention_days?: number;
    legal_hold?: boolean;
  };
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AttachmentAccessLog extends BaseEntity {
  attachment_id: string;
  user_id: string;
  access_type: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Metadata;
  created_at: string;
}

export interface AttachmentShare extends BaseEntity {
  attachment_id: string;
  shared_by: string;
  shared_with: string;
  permissions: {
    read: boolean;
    download: boolean;
    share?: boolean;
    edit?: boolean;
  };
  expires_at?: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
}

export interface AttachmentUploadConfig {
  max_size_bytes: number;
  allowed_types: string[];
  chunk_size: number;
  concurrent_chunks: number;
  retry_attempts: number;
  retry_delay: number;
}

export interface AttachmentPreviewConfig {
  max_preview_size: number;
  supported_types: string[];
  thumbnail_sizes: {
    width: number;
    height: number;
  }[];
}

export interface AttachmentEncryptionConfig {
  algorithm: string;
  key_size: number;
  iv_size: number;
  tag_length: number;
  chunk_size: number;
}

export interface AttachmentManager {
  uploadFile: (
    file: File,
    threadId: string,
    messageId?: string,
    onProgress?: (progress: number) => void
  ) => Promise<Attachment>;

  downloadFile: (
    attachmentId: string,
    onProgress?: (progress: number) => void
  ) => Promise<Blob>;

  getAttachment: (attachmentId: string) => Promise<Attachment>;
  
  getAttachments: (threadId: string, options?: {
    limit?: number;
    offset?: number;
    type?: AttachmentType[];
    status?: AttachmentStatus[];
  }) => Promise<Attachment[]>;

  shareAttachment: (
    attachmentId: string,
    userId: string,
    permissions: AttachmentShare['permissions'],
    expiresAt?: string
  ) => Promise<AttachmentShare>;

  revokeShare: (shareId: string) => Promise<void>;

  deleteAttachment: (attachmentId: string) => Promise<void>;

  getPreviewUrl: (attachmentId: string, size?: {
    width: number;
    height: number;
  }) => Promise<string>;

  getDownloadUrl: (attachmentId: string) => Promise<string>;

  getAccessLogs: (attachmentId: string) => Promise<AttachmentAccessLog[]>;
} 