import React, { useCallback, useEffect, useState } from 'react';
import { AttachmentService } from '../../services/attachments/AttachmentService';
import { Attachment, AttachmentShare } from '../../types/attachments';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Progress } from '../ui/Progress';
import { Alert } from '../ui/Alert';
import { formatBytes, formatDate } from '../../utils/format';

interface FilePreviewProps {
  attachment: Attachment;
  onDelete?: () => void;
  onShare?: (share: AttachmentShare) => void;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  attachment,
  onDelete,
  onShare,
  className
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const attachmentService = AttachmentService.getInstance(supabase, redis);

  const loadPreview = useCallback(async () => {
    if (!attachment.preview_metadata?.thumbnail_path) return;

    try {
      const url = await attachmentService.getPreviewUrl(attachment.id, {
        width: 300,
        height: 300
      });
      setPreviewUrl(url);
    } catch (err) {
      console.error('Failed to load preview:', err);
      // Don't show error UI for preview loading failures
    }
  }, [attachment.id, attachment.preview_metadata?.thumbnail_path, attachmentService]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleDownload = async () => {
    setIsLoading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const blob = await attachmentService.downloadFile(
        attachment.id,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.showToast({
        title: 'Download Complete',
        description: `${attachment.file_name} has been downloaded.`,
        type: 'success'
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to download file');
      setError(error.message);
      toast.showToast({
        title: 'Download Failed',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
  };

  const handleDelete = async () => {
    try {
      await attachmentService.deleteAttachment(attachment.id);
      onDelete?.();
      toast.showToast({
        title: 'File Deleted',
        description: `${attachment.file_name} has been deleted.`,
        type: 'success'
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete file');
      toast.showToast({
        title: 'Delete Failed',
        description: error.message,
        type: 'error'
      });
    }
  };

  const handleShare = async () => {
    try {
      const share = await attachmentService.shareAttachment(
        attachment.id,
        // For now, we'll just share with the current user
        (await supabase.auth.getUser()).data.user!.id,
        {
          read: true,
          download: true,
          share: false,
          edit: false
        },
        // Set expiration to 7 days from now
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      onShare?.(share);
      toast.showToast({
        title: 'File Shared',
        description: `${attachment.file_name} has been shared.`,
        type: 'success'
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to share file');
      toast.showToast({
        title: 'Share Failed',
        description: error.message,
        type: 'error'
      });
    }
  };

  const getFileIcon = () => {
    switch (attachment.file_type) {
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      case 'audio':
        return '🎵';
      case 'video':
        return '🎥';
      default:
        return '📎';
    }
  };

  return (
    <div className={`
      relative p-4 border rounded-lg
      ${attachment.status === 'ready' ? 'border-gray-200' : 'border-gray-300'}
      ${className}
    `}>
      <div className="flex items-start space-x-4">
        {/* Preview/Icon */}
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={attachment.file_name}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <span className="text-2xl">{getFileIcon()}</span>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {attachment.file_name}
          </h3>
          <div className="mt-1 text-xs text-gray-500 space-y-1">
            <p>Size: {formatBytes(attachment.size_bytes)}</p>
            <p>Uploaded: {formatDate(attachment.created_at)}</p>
            <p>Status: {attachment.status}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 space-y-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading || attachment.status !== 'ready'}
          >
            Download
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            disabled={attachment.status !== 'ready'}
          >
            Share
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg">
          <Spinner size="md" className="mb-2" />
          <div className="w-full max-w-xs px-4">
            <Progress value={downloadProgress} max={100} />
            <p className="text-sm text-center text-gray-600 mt-2">
              Downloading... {downloadProgress}%
            </p>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {attachment.status === 'processing' && (
        <div className="mt-2">
          <Alert variant="info">
            File is being processed. This may take a few moments.
          </Alert>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
}; 