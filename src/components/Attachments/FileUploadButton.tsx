import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AttachmentService } from '../../services/attachments/AttachmentService';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { Spinner } from '../ui/Spinner';
import { Alert } from '../ui/Alert';
import { formatBytes } from '../../utils/format';

interface FileUploadButtonProps {
  threadId: string;
  messageId?: string;
  onUploadComplete?: (attachmentId: string) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  threadId,
  messageId,
  onUploadComplete,
  onUploadError,
  className
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const attachmentService = AttachmentService.getInstance(supabase, redis);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      for (const file of files) {
        const attachment = await attachmentService.uploadFile(
          file,
          threadId,
          messageId,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        toast.showToast({
          title: 'File Uploaded',
          description: `${file.name} has been uploaded successfully.`,
          type: 'success'
        });

        onUploadComplete?.(attachment.id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upload file');
      setError(error.message);
      onUploadError?.(error);
      toast.showToast({
        title: 'Upload Failed',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [threadId, messageId, attachmentService, onUploadComplete, onUploadError, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    disabled: isUploading,
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

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          relative p-4 border-2 border-dashed rounded-lg
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-colors duration-200
        `}
      >
        <input {...getInputProps()} ref={inputRef} />
        
        <div className="flex flex-col items-center justify-center space-y-2">
          <svg
            className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div className="text-sm text-center">
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <p className="text-gray-600">
                Drag and drop files here, or{' '}
                <span className="text-primary hover:underline">browse</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Supported files: Images, PDF, DOC, DOCX, TXT, JSON (max 100MB)
            </p>
          </div>

          {!isDragActive && (
            <Button
              onClick={handleButtonClick}
              variant="secondary"
              size="sm"
              disabled={isUploading}
              className="mt-2"
            >
              Select Files
            </Button>
          )}
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80">
            <Spinner size="md" className="mb-2" />
            <div className="w-full max-w-xs px-4">
              <Progress value={uploadProgress} max={100} />
              <p className="text-sm text-center text-gray-600 mt-2">
                Uploading... {uploadProgress}%
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}
    </div>
  );
}; 