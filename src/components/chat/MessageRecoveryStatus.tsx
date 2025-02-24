import React, { useEffect, useState } from 'react';
import { MessageStatus } from '../../types/chat';
import { MessageRecoveryService } from '../../services/chat/MessageRecoveryService';
import { useSupabase } from '../../hooks/useSupabase';
import { useRedis } from '../../hooks/useRedis';
import { Alert, Progress, Button, Spinner } from '../ui';

interface MessageRecoveryStatusProps {
  threadId: string;
  onRecoveryComplete?: () => void;
}

export const MessageRecoveryStatus: React.FC<MessageRecoveryStatusProps> = ({
  threadId,
  onRecoveryComplete
}) => {
  const [stats, setStats] = useState<{
    total: number;
    needsKeyTransition: number;
    inTransition: number;
  }>({ total: 0, needsKeyTransition: 0, inTransition: 0 });

  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const recoveryService = MessageRecoveryService.getInstance(supabase, redis);

  const fetchStats = async () => {
    try {
      const currentStats = await recoveryService.getFailedMessageStats(threadId);
      setStats(currentStats);
      
      if (currentStats.total === 0 && onRecoveryComplete) {
        onRecoveryComplete();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch recovery stats');
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update stats every 5 seconds
    return () => clearInterval(interval);
  }, [threadId]);

  const handleRecoveryStart = async () => {
    setIsRecovering(true);
    setError(null);
    try {
      await recoveryService.recoverFailedMessages(threadId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start message recovery');
    } finally {
      setIsRecovering(false);
    }
  };

  if (stats.total === 0) {
    return null;
  }

  const recoveryProgress = Math.round(
    ((stats.total - stats.needsKeyTransition - stats.inTransition) / stats.total) * 100
  );

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Message Recovery Status
        </h3>
        {!isRecovering && (
          <Button
            onClick={handleRecoveryStart}
            disabled={stats.total === 0}
            variant="primary"
            size="sm"
          >
            Retry Failed Messages
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>Recovery Progress</span>
          <span>{recoveryProgress}%</span>
        </div>
        <Progress value={recoveryProgress} max={100} />
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-gray-600 dark:text-gray-300">Total Failed</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {stats.needsKeyTransition}
          </div>
          <div className="text-gray-600 dark:text-gray-300">Needs Key Transition</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{stats.inTransition}</div>
          <div className="text-gray-600 dark:text-gray-300">In Transition</div>
        </div>
      </div>

      {isRecovering && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <Spinner size="sm" />
          <span>Recovering messages...</span>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <style jsx>{`
        .progress-bar {
          transition: width 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}; 