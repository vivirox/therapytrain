import { SupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { ZKService } from '../zk/ZKService';
import { DistributedLockService } from '../chat/DistributedLockService';
import { logger } from '../../lib/logger';
import {
  Attachment,
  AttachmentType,
  AttachmentStatus,
  AttachmentShare,
  AttachmentAccessLog,
  AttachmentUploadConfig,
  AttachmentPreviewConfig,
  AttachmentEncryptionConfig,
  AttachmentManager
} from '../../types/attachments';

export class AttachmentService implements AttachmentManager {
  private static instance: AttachmentService;
  private supabase: SupabaseClient;
  private redis: Redis;
  private zkService: ZKService;
  private lockService: DistributedLockService;
  private serverId: string;

  private uploadConfig: AttachmentUploadConfig = {
    max_size_bytes: 100 * 1024 * 1024, // 100MB
    allowed_types: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json'
    ],
    chunk_size: 5 * 1024 * 1024, // 5MB chunks
    concurrent_chunks: 3,
    retry_attempts: 3,
    retry_delay: 1000
  };

  private previewConfig: AttachmentPreviewConfig = {
    max_preview_size: 2048,
    supported_types: ['image/*', 'application/pdf'],
    thumbnail_sizes: [
      { width: 100, height: 100 },
      { width: 300, height: 300 },
      { width: 800, height: 800 }
    ]
  };

  private encryptionConfig: AttachmentEncryptionConfig = {
    algorithm: 'AES-GCM',
    key_size: 256,
    iv_size: 12,
    tag_length: 128,
    chunk_size: 1024 * 1024 // 1MB chunks for encryption
  };

  private constructor(supabaseClient: SupabaseClient, redis: Redis) {
    this.supabase = supabaseClient;
    this.redis = redis;
    this.zkService = ZKService.getInstance();
    this.lockService = DistributedLockService.getInstance(redis);
    this.serverId = `server_${uuidv4()}`;
  }

  public static getInstance(supabaseClient: SupabaseClient, redis: Redis): AttachmentService {
    if (!AttachmentService.instance) {
      AttachmentService.instance = new AttachmentService(supabaseClient, redis);
    }
    return AttachmentService.instance;
  }

  private getLockKey(attachmentId: string): string {
    return `attachment:${attachmentId}`;
  }

  private async validateFile(file: File): Promise<void> {
    if (file.size > this.uploadConfig.max_size_bytes) {
      throw new Error(`File size exceeds maximum allowed size of ${this.uploadConfig.max_size_bytes} bytes`);
    }

    const isAllowedType = this.uploadConfig.allowed_types.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(`${baseType}/`);
      }
      return file.type === type;
    });

    if (!isAllowedType) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
  }

  private getAttachmentType(mimeType: string): AttachmentType {
    const baseType = mimeType.split('/')[0];
    switch (baseType) {
      case 'image':
        return 'image';
      case 'audio':
        return 'audio';
      case 'video':
        return 'video';
      case 'application':
      case 'text':
        return 'document';
      default:
        return 'other';
    }
  }

  public async uploadFile(
    file: File,
    threadId: string,
    messageId?: string,
    onProgress?: (progress: number) => void
  ): Promise<Attachment> {
    await this.validateFile(file);

    const attachmentId = uuidv4();
    const lockKey = this.getLockKey(attachmentId);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        throw new Error('Failed to acquire lock for file upload');
      }

      try {
        // Create attachment record
        const attachment: Attachment = {
          id: attachmentId,
          thread_id: threadId,
          message_id: messageId,
          uploader_id: (await this.supabase.auth.getUser()).data.user!.id,
          file_name: file.name,
          file_type: this.getAttachmentType(file.type),
          mime_type: file.type,
          size_bytes: file.size,
          status: 'uploading',
          encryption_key_version: 'current',
          storage_path: `attachments/${threadId}/${attachmentId}/${file.name}`,
          content_hash: await this.calculateFileHash(file),
          version: 1,
          is_latest: true,
          access_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await this.supabase
          .from('attachments')
          .insert(attachment);

        if (insertError) throw insertError;

        // Generate encryption key and IV
        const { key, iv } = await this.zkService.generateFileKey();
        
        // Process file in chunks
        const chunks = await this.splitFileIntoChunks(file);
        let uploadedBytes = 0;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const encryptedChunk = await this.zkService.encryptFileChunk(chunk, key, iv);
          
          const { error: uploadError } = await this.supabase.storage
            .from('secure-attachments')
            .upload(
              `${attachment.storage_path}/chunk_${i}`,
              encryptedChunk,
              { contentType: 'application/octet-stream' }
            );

          if (uploadError) throw uploadError;

          uploadedBytes += chunk.size;
          onProgress?.(Math.round((uploadedBytes / file.size) * 100));
        }

        // Update attachment record with encryption metadata
        const { error: updateError } = await this.supabase
          .from('attachments')
          .update({
            status: 'processing',
            encryption_metadata: {
              algorithm: this.encryptionConfig.algorithm,
              key_derivation: {
                method: 'HKDF',
                parameters: {
                  salt: await this.zkService.generateSalt(),
                  info: attachmentId
                }
              },
              iv: iv,
              tag: null, // Will be set after processing
              additional_data: {
                chunks: chunks.length,
                chunk_size: this.encryptionConfig.chunk_size
              }
            }
          })
          .eq('id', attachmentId);

        if (updateError) throw updateError;

        // Start async processing (virus scan, preview generation, etc.)
        this.processAttachment(attachmentId).catch(error => {
          logger.error('Error processing attachment', {
            attachmentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });

        return attachment;
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Error uploading file', {
        fileName: file.name,
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async splitFileIntoChunks(file: File): Promise<Blob[]> {
    const chunks: Blob[] = [];
    let offset = 0;
    
    while (offset < file.size) {
      chunks.push(file.slice(
        offset,
        offset + this.encryptionConfig.chunk_size
      ));
      offset += this.encryptionConfig.chunk_size;
    }

    return chunks;
  }

  private async processAttachment(attachmentId: string): Promise<void> {
    const lockKey = this.getLockKey(attachmentId);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(
        lockKey,
        holderId,
        5 * 60 * 1000 // 5 minutes timeout for processing
      );

      if (!lockAcquired) {
        throw new Error('Failed to acquire lock for attachment processing');
      }

      try {
        // Get attachment
        const { data: attachment, error: fetchError } = await this.supabase
          .from('attachments')
          .select('*')
          .eq('id', attachmentId)
          .single();

        if (fetchError || !attachment) {
          throw fetchError || new Error('Attachment not found');
        }

        // Virus scan
        const scanResult = await this.scanAttachment(attachment);
        if (!scanResult.clean) {
          await this.supabase
            .from('attachments')
            .update({
              status: 'failed',
              virus_scan_status: 'infected',
              virus_scan_result: scanResult
            })
            .eq('id', attachmentId);
          return;
        }

        // Generate preview if supported
        if (this.previewConfig.supported_types.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.split('/')[0];
            return attachment.mime_type.startsWith(`${baseType}/`);
          }
          return attachment.mime_type === type;
        })) {
          await this.generatePreviews(attachment);
        }

        // Mark as ready
        await this.supabase
          .from('attachments')
          .update({
            status: 'ready',
            virus_scan_status: 'clean',
            virus_scan_result: scanResult,
            updated_at: new Date().toISOString()
          })
          .eq('id', attachmentId);
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Error processing attachment', {
        attachmentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      await this.supabase
        .from('attachments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', attachmentId);
    }
  }

  private async scanAttachment(attachment: Attachment): Promise<{
    scanned_at: string;
    clean: boolean;
    threats?: string[];
    scanner_info?: Record<string, unknown>;
  }> {
    // TODO: Implement actual virus scanning
    // For now, return mock result
    return {
      scanned_at: new Date().toISOString(),
      clean: true,
      scanner_info: {
        name: 'MockScanner',
        version: '1.0.0'
      }
    };
  }

  private async generatePreviews(attachment: Attachment): Promise<void> {
    // TODO: Implement preview generation
    // This will depend on the file type and might include:
    // - Image thumbnails
    // - PDF previews
    // - Document previews
    // For now, just update the status
    await this.supabase
      .from('attachments')
      .update({
        preview_status: 'pending',
        preview_metadata: {
          type: attachment.mime_type,
          processing_info: {
            started_at: new Date().toISOString()
          }
        }
      })
      .eq('id', attachment.id);
  }

  public async downloadFile(
    attachmentId: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const lockKey = this.getLockKey(attachmentId);
    const holderId = `${this.serverId}:${Date.now()}`;

    try {
      const lockAcquired = await this.lockService.acquireLock(lockKey, holderId);
      if (!lockAcquired) {
        throw new Error('Failed to acquire lock for file download');
      }

      try {
        // Get attachment metadata
        const { data: attachment, error: fetchError } = await this.supabase
          .from('attachments')
          .select('*')
          .eq('id', attachmentId)
          .single();

        if (fetchError || !attachment) {
          throw fetchError || new Error('Attachment not found');
        }

        // Log access
        await this.supabase.from('attachment_access_logs').insert({
          id: uuidv4(),
          attachment_id: attachmentId,
          user_id: (await this.supabase.auth.getUser()).data.user!.id,
          access_type: 'download',
          metadata: {
            client_timestamp: new Date().toISOString()
          }
        });

        // Get encryption metadata
        if (!attachment.encryption_metadata) {
          throw new Error('Encryption metadata not found');
        }

        const { 
          algorithm,
          key_derivation,
          iv,
          additional_data
        } = attachment.encryption_metadata;

        if (!additional_data?.chunks || !additional_data?.chunk_size) {
          throw new Error('Invalid chunk metadata');
        }

        // Download and decrypt chunks
        const totalChunks = additional_data.chunks as number;
        const chunks: Blob[] = [];
        let downloadedChunks = 0;

        // Get decryption key
        const key = await this.zkService.getFileKey(
          attachment.encryption_key_version,
          attachment.encryption_key_id,
          key_derivation
        );

        for (let i = 0; i < totalChunks; i++) {
          const { data: encryptedChunk, error: downloadError } = await this.supabase.storage
            .from('secure-attachments')
            .download(`${attachment.storage_path}/chunk_${i}`);

          if (downloadError) throw downloadError;
          if (!encryptedChunk) throw new Error(`Failed to download chunk ${i}`);

          const decryptedChunk = await this.zkService.decryptFileChunk(
            encryptedChunk,
            key,
            iv
          );

          chunks.push(decryptedChunk);
          downloadedChunks++;
          
          onProgress?.(Math.round((downloadedChunks / totalChunks) * 100));
        }

        // Combine chunks
        const combinedBlob = new Blob(chunks, { type: attachment.mime_type });

        // Verify hash
        const downloadedHash = await this.calculateFileHash(combinedBlob);
        if (downloadedHash !== attachment.content_hash) {
          throw new Error('File integrity check failed');
        }

        await logger.info('File downloaded successfully', {
          attachmentId,
          fileName: attachment.file_name,
          size: combinedBlob.size
        });

        return combinedBlob;
      } finally {
        await this.lockService.releaseLock(lockKey, holderId);
      }
    } catch (error) {
      await logger.error('Error downloading file', {
        attachmentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async getDownloadUrl(attachmentId: string): Promise<string> {
    const attachment = await this.getAttachment(attachmentId);
    
    // Create a signed URL with short expiration
    const { data: signedUrl, error } = await this.supabase.storage
      .from('secure-attachments')
      .createSignedUrl(attachment.storage_path, 300); // 5 minutes expiration

    if (error) throw error;
    if (!signedUrl?.signedUrl) throw new Error('Failed to generate download URL');

    // Log access
    await this.supabase.from('attachment_access_logs').insert({
      id: uuidv4(),
      attachment_id: attachmentId,
      user_id: (await this.supabase.auth.getUser()).data.user!.id,
      access_type: 'url_generated',
      metadata: {
        expires_at: new Date(Date.now() + 300000).toISOString()
      }
    });

    return signedUrl.signedUrl;
  }

  public async getPreviewUrl(attachmentId: string, size?: {
    width: number;
    height: number;
  }): Promise<string> {
    const attachment = await this.getAttachment(attachmentId);
    
    if (!attachment.preview_metadata?.thumbnail_path) {
      throw new Error('Preview not available');
    }

    // Find the closest thumbnail size
    let thumbnailPath = attachment.preview_metadata.thumbnail_path;
    if (size && attachment.preview_metadata.dimensions) {
      const availableSizes = this.previewConfig.thumbnail_sizes;
      const closest = availableSizes.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.width - size.width);
        const currDiff = Math.abs(curr.width - size.width);
        return prevDiff < currDiff ? prev : curr;
      });
      
      thumbnailPath = thumbnailPath.replace(
        /(\d+x\d+)/,
        `${closest.width}x${closest.height}`
      );
    }

    // Create a signed URL with longer expiration for previews
    const { data: signedUrl, error } = await this.supabase.storage
      .from('secure-attachments')
      .createSignedUrl(thumbnailPath, 3600); // 1 hour expiration

    if (error) throw error;
    if (!signedUrl?.signedUrl) throw new Error('Failed to generate preview URL');

    // Log access
    await this.supabase.from('attachment_access_logs').insert({
      id: uuidv4(),
      attachment_id: attachmentId,
      user_id: (await this.supabase.auth.getUser()).data.user!.id,
      access_type: 'preview_viewed',
      metadata: {
        size,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }
    });

    return signedUrl.signedUrl;
  public async getAttachments(threadId: string, options?: {
    limit?: number;
    offset?: number;
    type?: AttachmentType[];
    status?: AttachmentStatus[];
  }): Promise<Attachment[]> {
    let query = this.supabase
      .from('attachments')
      .select('*')
      .eq('thread_id', threadId);

    if (options?.type?.length) {
      query = query.in('file_type', options.type);
    }

    if (options?.status?.length) {
      query = query.in('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  public async shareAttachment(
    attachmentId: string,
    userId: string,
    permissions: AttachmentShare['permissions'],
    expiresAt?: string
  ): Promise<AttachmentShare> {
    const { data, error } = await this.supabase
      .from('attachment_shares')
      .insert({
        id: uuidv4(),
        attachment_id: attachmentId,
        shared_by: (await this.supabase.auth.getUser()).data.user!.id,
        shared_with: userId,
        permissions,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create share');

    return data;
  }

  public async revokeShare(shareId: string): Promise<void> {
    const { error } = await this.supabase
      .from('attachment_shares')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', shareId);

    if (error) throw error;
  }

  public async deleteAttachment(attachmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('attachments')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', attachmentId);

    if (error) throw error;
  }

  public async getPreviewUrl(attachmentId: string, size?: {
    width: number;
    height: number;
  }): Promise<string> {
    // TODO: Implement preview URL generation
    throw new Error('Method not implemented.');
  }

  public async getDownloadUrl(attachmentId: string): Promise<string> {
    // TODO: Implement download URL generation
    throw new Error('Method not implemented.');
  }

  public async getAccessLogs(attachmentId: string): Promise<AttachmentAccessLog[]> {
    const { data, error } = await this.supabase
      .from('attachment_access_logs')
      .select('*')
      .eq('attachment_id', attachmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
} 