import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog-header";
import { MdGroups as Users, MdMessage as MessageSquare, MdShare as Share2, MdThumbUp as ThumbsUp, MdMenuBook as BookOpen, MdAdd as Plus, MdCalendarMonth as Calendar, MdSearch as Search } from 'react-icons/md';
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

interface Reply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: Date;
}

interface PeerDiscussion {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    tags: string[];
    createdAt: Date;
    likes: number;
    replies: Reply[];
}

interface Member {
    id: string;
    name: string;
    avatar?: string;
    role: 'leader' | 'member';
}

interface MeetingSchedule {
    day: string;
    time: string;
    frequency: 'weekly' | 'biweekly' | 'monthly';
}

interface UpcomingSession {
    date: Date;
    topic: string;
    materials: string[];
}

interface StudyGroup {
    id: string;
    name: string;
    description: string;
    members: Member[];
    meetingSchedule?: MeetingSchedule;
    topics: string[];
    upcomingSession?: UpcomingSession;
}

interface NewDiscussion {
    title: string;
    content: string;
    tags: string[];
}

interface PeerLearningProps {
    userId: string;
    className?: string;
}

interface ApiError {
    message: string;
    code?: string;
    details?: unknown;
}

export const PeerLearning: React.FC<PeerLearningProps> = ({ userId, className }) => {
    const [discussions, setDiscussions] = useState<PeerDiscussion[]>([]);
    const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
    const [newDiscussion, setNewDiscussion] = useState<NewDiscussion>({ title: '', content: '', tags: [] });
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const fetchPeerContent = async () => {
            setError(null);
            try {
                const [discussionsRes, groupsRes] = await Promise.all([
                    fetch('/api/peer-discussions'),
                    fetch('/api/study-groups')
                ]);

                if (!discussionsRes.ok || !groupsRes.ok) {
                    throw new Error('Failed to fetch content');
                }

                const [discussionsData, groupsData] = await Promise.all([
                    discussionsRes.json(),
                    groupsRes.json()
                ]);

                setDiscussions(discussionsData);
                setStudyGroups(groupsData);
            } catch (error) {
                const apiError = error as ApiError;
                console.error('Error fetching peer content:', apiError);
                setError(apiError.message || 'Failed to load content');
            } finally {
                setLoading(false);
            }
        };
        void fetchPeerContent();
    }, []);

    const createDiscussion = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

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

            if (!response.ok) {
                throw new Error('Failed to create discussion');
            }

            const data = await response.json();
            setDiscussions(prev => [data, ...prev]);
            setNewDiscussion({ title: '', content: '', tags: [] });
        } catch (error) {
            const apiError = error as ApiError;
            console.error('Error creating discussion:', apiError);
            setError(apiError.message || 'Failed to create discussion');
        } finally {
            setIsSubmitting(false);
        }
    };

    const joinStudyGroup = async (groupId: string) => {
        setError(null);
        try {
            const response = await fetch(`/api/study-groups/${groupId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                throw new Error('Failed to join group');
            }

            setStudyGroups(prev => prev.map((group: any) => group.id === groupId
                ? {
                    ...group,
                    members: [...group.members, { id: userId, name: '', role: 'member' }]
                }
                : group));
        } catch (error) {
            const apiError = error as ApiError;
            console.error('Error joining study group:', apiError);
            setError(apiError.message || 'Failed to join group');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof NewDiscussion) => {
        if (field === 'tags') {
            setNewDiscussion(prev => ({
                ...prev,
                tags: e.target.value.split(',').map((tag: any) => tag.trim()).filter(Boolean)
            }));
        } else {
            setNewDiscussion(prev => ({
                ...prev,
                [field]: e.target.value
            }));
        }
    };

    if (loading) {
        return <Loading size="lg" />;
    }

    if (error) {
        return (
            <div className="text-center p-6">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (<div className={cn("max-w-6xl mx-auto p-6 space-y-8", className)}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Peer Learning Hub</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Start Discussion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className="space-y-1">
              <DialogTitle>Create New Discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input 
                placeholder="Discussion title" 
                value={newDiscussion.title} 
                onChange={(e) => handleInputChange(e, 'title')}
              />
              <Textarea 
                placeholder="Share your thoughts or questions..." 
                value={newDiscussion.content} 
                onChange={(e) => handleInputChange(e, 'content')}
              />
              <Input 
                placeholder="Add tags (comma-separated)" 
                onChange={(e) => handleInputChange(e, 'tags')}
              />
              <Button 
                onClick={createDiscussion} 
                disabled={!newDiscussion.title || !newDiscussion.content}
              >
                {isSubmitting ? "Posting..." : "Post Discussion"}
              </Button>
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
              <Input className="pl-10" placeholder="Search discussions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
          </Card>

          {discussions
            .filter((discussion: any) => discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            discussion.content.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((discussion: any) => (<Card key={discussion.id} className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={discussion.authorAvatar} alt={discussion.authorName} />
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
                      {discussion.tags.map((tag: any) => (<Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>))}
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
              </Card>))}
        </div>

        {/* Study Groups Column */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Study Groups</h2>
          {studyGroups.map((group: any) => (<Card key={group.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-400">{group.description}</p>
                  </div>
                  <Users className="w-6 h-6 text-primary" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.topics.map((topic: any) => (<Badge key={topic} variant="outline">
                      {topic}
                    </Badge>))}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{group.members.length} members</span>
                </div>

                {group.upcomingSession && (<div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <div className="font-medium">Next Session</div>
                      <div className="text-gray-400">
                        {new Date(group.upcomingSession.date).toLocaleDateString()}{' '}
                        - {group.upcomingSession.topic}
                      </div>
                    </div>
                  </div>)}

                <Button variant="outline" className="w-full" onClick={() => joinStudyGroup(group.id)} disabled={group.members.some(member => member.id === userId)}>
                  {group.members.some(member => member.id === userId)
                ? 'Joined'
                : 'Join Group'}
                </Button>
              </div>
            </Card>))}
        </div>
      </div>
    </div>);
};

export default PeerLearning;

