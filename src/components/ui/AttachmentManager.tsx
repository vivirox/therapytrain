import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Progress } from "./progress";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  progress?: number;
  error?: string;
}

export interface AttachmentManagerProps extends React.HTMLAttributes<HTMLDivElement> {
  attachments?: Attachment[];
  onUpload?: (files: FileList) => void;
  onRemove?: (attachment: Attachment) => void;
  onRetry?: (attachment: Attachment) => void;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export const AttachmentManager = React.forwardRef<HTMLDivElement, AttachmentManagerProps>(
  ({ 
    className,
    attachments = [],
    onUpload,
    onRemove,
    onRetry,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = "*",
    multiple = true,
    disabled = false,
    ...props 
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onUpload) {
        onUpload(e.target.files);
      }
      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const formatSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Upload Button */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Upload Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
          />
        </div>

        {/* Attachments List */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="truncate font-medium">
                      {attachment.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatSize(attachment.size)}
                    </span>
                  </div>
                  
                  {attachment.progress !== undefined && attachment.progress < 100 && (
                    <Progress value={attachment.progress} className="mt-2" />
                  )}
                  
                  {attachment.error && (
                    <p className="text-sm text-destructive mt-1">
                      {attachment.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {attachment.error && onRetry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRetry(attachment)}
                    >
                      Retry
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(attachment)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AttachmentManager.displayName = "AttachmentManager"; 