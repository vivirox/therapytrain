import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  MdGroups as Users,
  MdMessage as MessageSquare,
  MdShare as Share2,
  MdThumbUp as ThumbsUp,
  MdMenuBook as BookOpen,
  MdAdd as Plus,
  MdCalendarMonth as Calendar,
  MdSearch as Search
} from 'react-icons/md';

interface PeerDiscussion {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  tags: Array<string>;
  createdAt: Date;
  likes: number;
  replies: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Date;
  }>;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: 'leader' | 'member';
  }>;
  meetingSchedule?: {
    day: string;
    time: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
  };
  topics: Array<string>;
  upcomingSession?: {
    date: Date;
    topic: string;
    materials: Array<string>;
  };
}

interface PeerLearningProps {
  userId: string;
}

export const PeerLearning: React.FC<PeerLearningProps> = ({ userId }) => {
  const [discussions, setDiscussions] = useState<Array<PeerDiscussion>>([]);
  const [studyGroups, setStudyGroups] = useState<Array<StudyGroup>>([]);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', tags: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeerContent = async () => {
      try {
        const [discussionsRes, groupsRes] = await Promise.all([
          fetch('/api/peer-discussions'),
          fetch('/api/study-groups')
        ]);

        if (discussionsRes.ok && groupsRes.ok) {
          const [discussionsData, groupsData] = await Promise.all([
            discussionsRes.json(),
            groupsRes.json()
          ]);

          setDiscussions(discussionsData);
          setStudyGroups(groupsData);
        }
      } catch (error) {
        console.error('Error fetching peer content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeerContent();
  }, []);

  const createDiscussion = async () => {
    try {
      const response = await fetch('/api/peer-discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDiscussion,
          authorId: userId,
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDiscussions(prev => [data, ...prev]);
        setNewDiscussion({ title: '', content: '', tags: [] });
      }
    } catch (error) {
      console.error('Error creating discussion:', error);
    }
  };

  const joinStudyGroup = async (groupId: string) => {
    try {
      await fetch(`/api/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      setStudyGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? {
                ...group,
                members: [...group.members, { id: userId, name: '', role: 'member' }]
              }
            : group
        )
      );
    } catch (error) {
      console.error('Error joining study group:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Peer Learning Hub</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Start Discussion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Discussion title"
                value={newDiscussion.title}
                onChange={e: unknown =>
                  setNewDiscussion(prev => ({ ...prev, title: e.target.value }))
                }
              />
              <Textarea
                placeholder="Share your thoughts or questions..."
                value={newDiscussion.content}
                onChange={e: unknown =>
                  setNewDiscussion(prev => ({ ...prev, content: e.target.value }))
                }
              />
              <Input
                placeholder="Add tags (comma-separated)"
                onChange={e: unknown =>
                  setNewDiscussion(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(tag: unknown => tag.trim())
                  }))
                }
              />
              <Button onClick={createDiscussion}>Post Discussion</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Discussions Column */}
        <div className="col-span-2 space-y-6">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search discussions..."
                value={searchTerm}
                onChange={e: unknown => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>

          {discussions
            .filter(
              discussion =>
                discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                discussion.content.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(discussion => (
              <Card key={discussion.id} className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={discussion.authorAvatar} />
                    <AvatarFallback>
                      {discussion.authorName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{discussion.title}</h3>
                      <span className="text-sm text-gray-400">
                        {new Date(discussion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {discussion.authorName}
                    </p>
                    <p className="mb-4">{discussion.content}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {discussion.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <button className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {discussion.likes}
                      </button>
                      <button className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {discussion.replies.length} replies
                      </button>
                      <button className="flex items-center gap-1">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
        </div>

        {/* Study Groups Column */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Study Groups</h2>
          {studyGroups.map(group => (
            <Card key={group.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-400">{group.description}</p>
                  </div>
                  <Users className="w-6 h-6 text-primary" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.topics.map(topic => (
                    <Badge key={topic} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{group.members.length} members</span>
                </div>

                {group.upcomingSession && (
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Next Session</div>
                      <div className="text-gray-400">
                        {new Date(
                          group.upcomingSession.date
                        ).toLocaleDateString()}{' '}
                        - {group.upcomingSession.topic}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => joinStudyGroup(group.id)}
                  disabled={group.members.some(member => member.id === userId)}
                >
                  {group.members.some(member => member.id === userId)
                    ? 'Joined'
                    : 'Join Group'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PeerLearning;
