import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Video, MessageSquare, ArrowRight } from 'lucide-react';
import { sessionManager, type SessionMode, type SessionState } from '@/services/sessionManager';
import { Badge } from '@/components/ui/badge';

interface Props {
  clientId: string;
  onModeChange?: (mode: SessionMode) => void;
}

const SessionControls = ({ clientId, onModeChange }: Props) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const newSession = await sessionManager.startSession(clientId, 'text');
        setSession(newSession);
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    };

    initSession();
  }, [clientId]);

  const handleModeToggle = async () => {
    try {
      const newMode = videoEnabled ? 'text' : 'hybrid';
      await sessionManager.switchMode(newMode);
      setVideoEnabled(!videoEnabled);
      onModeChange?.(newMode);
    } catch (error) {
      console.error('Failed to switch mode:', error);
    }
  };

  if (!session) return null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Session Controls</h3>
        <Badge variant={session.status === 'active' ? 'success' : 'secondary'}>
          {session.status.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {videoEnabled ? (
            <Video className="h-5 w-5 text-blue-500" />
          ) : (
            <MessageSquare className="h-5 w-5 text-gray-500" />
          )}
          <span>Video Mode</span>
        </div>
        <Switch
          checked={videoEnabled}
          onCheckedChange={handleModeToggle}
        />
      </div>

      {session.currentBranch && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <ArrowRight className="h-4 w-4" />
          <span>Branched scenario active</span>
        </div>
      )}
    </Card>
  );
};

export default SessionControls;
