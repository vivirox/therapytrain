import React, { useCallback, useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSupabase } from '../../../hooks/useSupabase';
import { useRedis } from '../../../hooks/useRedis';
import { useToast } from '../../../hooks/useToast';
import { ThreadManagementService } from '../../../services/chat/ThreadManagementService';
import { ThreadWithMetadata, ThreadGroup } from '../../../types/thread';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Spinner } from '../../ui/Spinner';
import { Alert } from '../../ui/Alert';

interface ThreadOrganizerProps {
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  className?: string;
}

interface DraggableThreadProps {
  thread: ThreadWithMetadata;
  index: number;
  groupId?: string;
  onMove: (dragIndex: number, hoverIndex: number, groupId?: string) => void;
  onSelect: (threadId: string) => void;
  isSelected: boolean;
}

interface DraggableGroupProps {
  group: ThreadGroup;
  threads: ThreadWithMetadata[];
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onMove: (dragIndex: number, hoverIndex: number, groupId?: string) => void;
  onGroupMove: (dragIndex: number, hoverIndex: number) => void;
  index: number;
}

const DraggableThread: React.FC<DraggableThreadProps> = ({
  thread,
  index,
  groupId,
  onMove,
  onSelect,
  isSelected
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'THREAD',
    item: { type: 'THREAD', id: thread.id, index, groupId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: 'THREAD',
    hover: (item: { type: string; id: string; index: number; groupId?: string }) => {
      if (item.id === thread.id) return;
      onMove(item.index, index, groupId);
      item.index = index;
      item.groupId = groupId;
    }
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        p-3 border rounded-lg mb-2 cursor-move
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'bg-primary/10' : 'bg-white dark:bg-gray-800'}
      `}
      onClick={() => onSelect(thread.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">
            {thread.metadata.title || 'Untitled Thread'}
          </h4>
          {thread.metadata.description && (
            <p className="text-sm text-gray-500 truncate mt-1">
              {thread.metadata.description}
            </p>
          )}
        </div>
        {thread.unread_count > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
            {thread.unread_count}
          </span>
        )}
      </div>
    </div>
  );
};

const DraggableGroup: React.FC<DraggableGroupProps> = ({
  group,
  threads,
  selectedThreadId,
  onThreadSelect,
  onMove,
  onGroupMove,
  index
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const [{ isDragging }, drag] = useDrag({
    type: 'GROUP',
    item: { type: 'GROUP', id: group.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: ['THREAD', 'GROUP'],
    hover: (item: { type: string; id: string; index: number; groupId?: string }) => {
      if (item.type === 'GROUP') {
        if (item.id === group.id) return;
        onGroupMove(item.index, index);
        item.index = index;
      } else if (item.type === 'THREAD') {
        if (item.groupId === group.id) return;
        onMove(item.index, 0, group.id);
        item.index = 0;
        item.groupId = group.id;
      }
    }
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        border rounded-lg p-2 mb-4
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-left"
        >
          <span className="transform transition-transform duration-200">
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="font-medium">{group.name}</h3>
          <span className="text-gray-500 text-sm">({threads.length})</span>
        </button>
      </div>

      {isExpanded && (
        <div className="pl-4">
          {threads.map((thread, threadIndex) => (
            <DraggableThread
              key={thread.id}
              thread={thread}
              index={threadIndex}
              groupId={group.id}
              onMove={onMove}
              onSelect={onThreadSelect}
              isSelected={thread.id === selectedThreadId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ThreadOrganizer: React.FC<ThreadOrganizerProps> = ({
  selectedThreadId,
  onThreadSelect,
  className
}) => {
  const [threads, setThreads] = useState<ThreadWithMetadata[]>([]);
  const [groups, setGroups] = useState<ThreadGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const { supabase } = useSupabase();
  const { redis } = useRedis();
  const toast = useToast();
  const threadService = ThreadManagementService.getInstance(supabase, redis);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load threads and groups
      const [loadedThreads, { data: loadedGroups }] = await Promise.all([
        threadService.getThreads(),
        supabase.from('thread_groups').select('*').order('position')
      ]);

      if (!loadedGroups) throw new Error('Failed to load groups');

      setThreads(loadedThreads);
      setGroups(loadedGroups);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error.message);
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [threadService, supabase, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleThreadMove = async (
    dragIndex: number,
    hoverIndex: number,
    groupId?: string
  ) => {
    const dragThread = threads[dragIndex];
    const updatedThreads = [...threads];
    updatedThreads.splice(dragIndex, 1);
    updatedThreads.splice(hoverIndex, 0, dragThread);
    setThreads(updatedThreads);

    try {
      if (groupId) {
        await threadService.addThreadToGroup(groupId, dragThread.id, hoverIndex);
      } else {
        await threadService.moveThread(dragThread.id, {
          position: hoverIndex
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to move thread');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
      loadData(); // Reload to reset state
    }
  };

  const handleGroupMove = async (dragIndex: number, hoverIndex: number) => {
    const dragGroup = groups[dragIndex];
    const updatedGroups = [...groups];
    updatedGroups.splice(dragIndex, 1);
    updatedGroups.splice(hoverIndex, 0, dragGroup);
    setGroups(updatedGroups);

    try {
      await threadService.updateGroup(dragGroup.id, {
        position: hoverIndex
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to move group');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
      loadData(); // Reload to reset state
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await threadService.createGroup({
        name: newGroupName.trim(),
        position: groups.length
      });

      setNewGroupName('');
      loadData();

      toast.showToast({
        title: 'Group Created',
        description: 'New group has been created successfully.',
        type: 'success'
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create group');
      toast.showToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  if (error) {
    return (
      <Alert variant="error" className="m-4">
        {error}
        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          className="mt-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={className}>
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">Organize Threads</h2>

          {/* New Group Form */}
          <div className="flex space-x-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
            >
              Create Group
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div>
              {/* Groups */}
              {groups.map((group, groupIndex) => (
                <DraggableGroup
                  key={group.id}
                  group={group}
                  threads={threads.filter(t =>
                    t.groups?.some(g => g.id === group.id)
                  )}
                  selectedThreadId={selectedThreadId}
                  onThreadSelect={onThreadSelect}
                  onMove={handleThreadMove}
                  onGroupMove={handleGroupMove}
                  index={groupIndex}
                />
              ))}

              {/* Ungrouped Threads */}
              <div className="mt-4">
                <h3 className="font-medium mb-2">Ungrouped Threads</h3>
                {threads
                  .filter(t => !t.groups?.length)
                  .map((thread, index) => (
                    <DraggableThread
                      key={thread.id}
                      thread={thread}
                      index={index}
                      onMove={handleThreadMove}
                      onSelect={onThreadSelect}
                      isSelected={thread.id === selectedThreadId}
                    />
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}; 