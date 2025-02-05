import { type FC } from 'react';
import { MdPsychology as Brain } from 'react-icons/md';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export const Loading: FC<LoadingProps> = ({ 
  fullScreen = false,
  message = 'Loading...'
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <Brain className="w-12 h-12 text-blue-500 animate-pulse" />
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
      </div>
      <p className="text-gray-600 animate-pulse">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};
