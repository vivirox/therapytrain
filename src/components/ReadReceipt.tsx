import { FC } from 'react';

interface ReadReceiptProps {
  isRead: boolean;
  readAt?: Date;
}

export const ReadReceipt: FC<ReadReceiptProps> = ({ isRead, readAt }) => {
  return (
    <div className="flex items-center text-xs text-gray-500">
      {isRead ? (
        <>
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
          {readAt && <span className="ml-1">{readAt.toLocaleTimeString()}</span>}
        </>
      ) : (
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      )}
    </div>
  );
};
