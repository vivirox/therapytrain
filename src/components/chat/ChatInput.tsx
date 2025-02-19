import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';
import { AttachmentService } from '../../services/attachments/AttachmentService';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { useToast } from '../../hooks/useToast';
import { Attachment } from '../../types/attachments';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onTyping?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  disabled,
  isLoading,
  placeholder = 'Type a message...',
  className
}) => {
  const [message, setMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const attachmentService = AttachmentService.getInstance(supabase, redis);

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadedAttachments: Attachment[] = [];
      for (const file of files) {
        const attachment = await attachmentService.uploadFile(
          file,
          'temp', // Will be updated when message is sent
          undefined,
          (progress) => {
            setUploadProgress(progress);
          }
        );
        uploadedAttachments.push(attachment);
      }
      setPendingAttachments(prev => [...prev, ...uploadedAttachments]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upload file');
      setError(error.message);
      toast.showToast({
        title: 'Upload Failed',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [attachmentService, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    disabled: isUploading || disabled,
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    },
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && pendingAttachments.length === 0) return;

    onSendMessage(message, pendingAttachments);
    setMessage('');
    setPendingAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {/* Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="mb-2 space-y-2">
          {pendingAttachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm truncate">{attachment.file_name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAttachment(attachment.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`
            w-full
            resize-none
            rounded-lg
            border
            border-gray-300
            focus:border-primary
            focus:ring-1
            focus:ring-primary
            p-3
            pr-24
            min-h-[80px]
            ${isDragActive ? 'border-primary bg-primary/10' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          {...getRootProps()}
        />
        <input {...getInputProps()} />

        {/* Upload Progress */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-center">
              <Spinner size="sm" className="mb-2" />
              <p className="text-sm text-gray-600">
                Uploading... {uploadProgress}%
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => textareaRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </Button>
          <Button
            type="submit"
            disabled={
              disabled ||
              isLoading ||
              isUploading ||
              (!message.trim() && pendingAttachments.length === 0)
            }
          >
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}
    </form>
  );
}; 