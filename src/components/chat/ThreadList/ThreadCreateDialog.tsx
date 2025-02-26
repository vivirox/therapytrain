import React, { useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useRedis } from '@/hooks/useRedis';
import { useToast } from '@/hooks/useToast';
import { ThreadManagementService } from '../../../services/chat/ThreadManagementService';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Select } from '../../ui/Select';
import { UserProfile } from '../../../types/user';

interface ThreadCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated: (threadId: string) => void;
  availableParticipants: UserProfile[];
  className?: string;
}

export const ThreadCreateDialog: React.FC<ThreadCreateDialogProps> = ({
  isOpen,
  onClose,
  onThreadCreated,
  availableParticipants,
  className
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Array<{
    userId: string;
    role: 'therapist' | 'client';
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const threadService = ThreadManagementService.getInstance(supabase, redis);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedParticipants.length === 0) {
      toast.showToast({
        title: 'Error',
        description: 'Please select at least one participant.',
        type: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      const thread = await threadService.createThread({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        participants: selectedParticipants
      });

      toast.showToast({
        title: 'Thread Created',
        description: 'New thread has been created successfully.',
        type: 'success'
      });

      onThreadCreated(thread.id);
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create thread');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleParticipantChange = (userId: string, role: 'therapist' | 'client') => {
    setSelectedParticipants(prev => {
      const existing = prev.find(p => p.userId === userId);
      if (existing) {
        return prev.map(p => 
          p.userId === userId ? { ...p, role } : p
        );
      }
      return [...prev, { userId, role }];
    });
  };

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Thread"
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter thread title"
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter thread description"
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Participants
          </label>
          <div className="space-y-2">
            {availableParticipants.map(participant => {
              const selected = selectedParticipants.find(p => p.userId === participant.id);
              return (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {participant.name || participant.email}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selected ? (
                      <>
                        <Select
                          value={selected.role}
                          onChange={(e) => handleParticipantChange(
                            participant.id,
                            e.target.value as 'therapist' | 'client'
                          )}
                          className="w-32"
                        >
                          <option value="therapist">Therapist</option>
                          <option value="client">Client</option>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-red-500"
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleParticipantChange(participant.id, 'client')}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || selectedParticipants.length === 0}
          >
            {isLoading ? 'Creating...' : 'Create Thread'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}; 