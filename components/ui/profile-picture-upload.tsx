'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { ProfilePictureDisplay } from './profile-picture-display';
import { Button } from './button';

interface ProfilePictureUploadProps {
  currentPicture?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export function ProfilePictureUpload({
  currentPicture,
  onUpload,
  onDelete,
  className,
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const cancelUploadRef = useRef<() => void>();

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadProgress(0);

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      setIsUploading(true);
      await onUpload(file);
      setIsUploading(false);
      setUploadProgress(100);
      
      // Cleanup preview after successful upload
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      setPreview(null);
    } catch (err) {
      setError('Failed to delete image. Please try again.');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <ProfilePictureDisplay
            src={preview || currentPicture}
            alt="Profile picture"
            size="lg"
          />
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isDragActive ? (
              <p>Drop the image here</p>
            ) : (
              <p>Drag and drop an image, or click to select</p>
            )}
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
            <div className="w-full max-w-xs px-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {onDelete && currentPicture && (
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isUploading}
          className="w-full"
        >
          Remove Picture
        </Button>
      )}
    </div>
  );
} 