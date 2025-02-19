import React, { useCallback, useEffect, useState } from 'react';
import { AttachmentService } from '../../services/attachments/AttachmentService';
import { Attachment, AttachmentType, AttachmentStatus } from '../../types/attachments';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { useToast } from '../../hooks/useToast';
import { FileUploadButton } from './FileUploadButton';
import { FilePreview } from './FilePreview';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';

interface AttachmentManagerProps {
  threadId: string;
  messageId?: string;
  className?: string;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  threadId,
  messageId,
  className
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type?: AttachmentType[];
    status?: AttachmentStatus[];
  }>({});
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const attachmentService = AttachmentService.getInstance(supabase, redis);

  const loadAttachments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const files = await attachmentService.getAttachments(threadId, {
        ...filter,
        limit: 50 // Reasonable limit for initial load
      });
      setAttachments(files);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load attachments');
      setError(error.message);
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [threadId, filter, attachmentService, toast]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleUploadComplete = useCallback((attachmentId: string) => {
    loadAttachments();
  }, [loadAttachments]);

  const handleDelete = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  const filterByType = (type: AttachmentType | 'all') => {
    setFilter(prev => ({
      ...prev,
      type: type === 'all' ? undefined : [type]
    }));
  };

  const filterByStatus = (status: AttachmentStatus | 'all') => {
    setFilter(prev => ({
      ...prev,
      status: status === 'all' ? undefined : [status]
    }));
  };

  return (
    <div className={className}>
      {/* Upload Section */}
      <div className="mb-6">
        <FileUploadButton
          threadId={threadId}
          messageId={messageId}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="space-x-2">
          <Button
            variant={!filter.type ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByType('all')}
          >
            All Types
          </Button>
          <Button
            variant={filter.type?.includes('document') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByType('document')}
          >
            Documents
          </Button>
          <Button
            variant={filter.type?.includes('image') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByType('image')}
          >
            Images
          </Button>
        </div>

        <div className="space-x-2">
          <Button
            variant={!filter.status ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByStatus('all')}
          >
            All Status
          </Button>
          <Button
            variant={filter.status?.includes('ready') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByStatus('ready')}
          >
            Ready
          </Button>
          <Button
            variant={filter.status?.includes('processing') ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => filterByStatus('processing')}
          >
            Processing
          </Button>
        </div>
      </div>

      {/* Attachments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="error">
            {error}
            <Button
              variant="secondary"
              size="sm"
              onClick={loadAttachments}
              className="mt-2"
            >
              Retry
            </Button>
          </Alert>
        ) : attachments.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            No attachments found
          </div>
        ) : (
          attachments.map(attachment => (
            <FilePreview
              key={attachment.id}
              attachment={attachment}
              onDelete={() => handleDelete(attachment.id)}
            />
          ))
        )}
      </div>

      {/* Load More (if needed) */}
      {attachments.length >= 50 && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            onClick={() => {
              // Implement load more logic
            }}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}; 