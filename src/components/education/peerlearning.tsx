import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Calendar } from 'lucide-react';

interface PeerSession {
  id: string;
  title: string;
  description: string;
  date: string;
  participants: number;
  maxParticipants: number;
  status: 'upcoming' | 'in-progress' | 'completed';
}

interface PeerLearningProps {
  sessions: PeerSession[];
  onJoinSession: (sessionId: string) => void;
}

export function PeerLearning({ sessions, onJoinSession }: PeerLearningProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Peer Learning Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{session.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      session.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      session.status === 'in-progress' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {session.participants}/{session.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onJoinSession(session.id)}
                      disabled={session.status === 'completed' || session.participants >= session.maxParticipants}
                    >
                      {session.status === 'completed' ? 'Completed' : 'Join Session'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 