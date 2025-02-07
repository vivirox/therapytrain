import React, { useState } from 'react';
import { useChat } from "@/../contexts/ChatContext";
import { Session } from "@/../../../backend/src/types/chat";
import { MoreVertical, Settings, Share2, Download, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
interface ChatHeaderProps {
    session: Session;
}
export function ChatHeader({ session }: ChatHeaderProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { dispatch } = useChat();
    const handleExport = async () => {
        try {
            const response = await fetch(`/api/chat/sessions/${session.id}/messages`);
            const messages = await response.json();
            const exportData = {
                session: {
                    id: session.id,
                    title: session.payload.title,
                    created_at: session.created_at
                },
                messages: messages.map((msg: any) => ({
                    role: msg.payload.role,
                    content: msg.payload.content,
                    created_at: msg.created_at
                }))
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-${session.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        catch (error) {
            console.error('Failed to export chat:', error);
        }
    };
    const handleShare = async () => {
        try {
            const response = await fetch(`/api/chat/sessions/${session.id}/share`, { method: 'POST' });
            const { shareUrl } = await response.json();
            await navigator.clipboard.writeText(shareUrl);
            // Show success toast
        }
        catch (error) {
            console.error('Failed to share chat:', error);
        }
    };
    const handleDelete = async () => {
        try {
            await fetch(`/api/chat/sessions/${session.id}`, {
                method: 'DELETE'
            });
            dispatch({ type: 'SET_CURRENT_SESSION', payload: null });
            // Show success toast
        }
        catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };
    return (<>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold">{session.payload.title}</h2>
          <p className="text-sm text-gray-500">
            {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4"/>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4"/>
              Share Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>
              <Download className="mr-2 h-4 w-4"/>
              Export Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4"/>
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>
              Configure the chat settings and AI behavior
            </DialogDescription>
          </DialogHeader>
          {/* Add settings form here */}
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
            handleDelete();
            setShowDeleteConfirm(false);
        }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);
}
