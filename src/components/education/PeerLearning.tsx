// @ts-nocheck
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
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { PeerDiscussion, Reply, Member, MeetingSchedule, UpcomingSession, StudyGroup, NewDiscussion, PeerLearningProps, ApiError } from "@/types";

type LoadingStateProps = Record<string, never>;

export default function PeerLearning({ userId, className }: PeerLearningProps): JSX.Element {
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
        return React.createElement('div', 
            { className: "flex justify-center items-center p-6" },
            React.createElement(Loader2, { 
                className: "h-8 w-8 animate-spin",
                "aria-label": "Loading" 
            })
        );
    }

    if (error) {
        return React.createElement('div', 
            { className: "text-center p-6" },
            [
                React.createElement('p', 
                    { className: "text-destructive mb-4", key: 'message' }, 
                    error
                ),
                React.createElement(Button, 
                    { 
                        onClick: () => window.location.reload(),
                        key: 'button'
                    }, 
                    'Retry'
                )
            ]
        );
    }

    return (
        React.createElement('div', 
            { className: cn("max-w-6xl mx-auto p-6 space-y-8", className) },
            React.createElement('div', 
                { className: "flex items-center justify-between mb-8" },
                React.createElement('h1', 
                    { className: "text-3xl font-bold" }, 
                    'Peer Learning Hub'
                ),
                React.createElement(Dialog, {},
                    React.createElement(DialogTrigger, {},
                        React.createElement(Button, 
                            { className: "flex items-center gap-2" },
                            React.createElement(Plus, { className: "w-4 h-4" }),
                            'Start Discussion'
                        )
                    ),
                    React.createElement(DialogContent, { className: "sm:max-w-[425px]" },
                        React.createElement(DialogHeader, { className: "space-y-1" },
                            React.createElement(DialogTitle, {}, 'Create New Discussion')
                        ),
                        React.createElement('div', { className: "space-y-4" },
                            React.createElement(Input, 
                                { 
                                    placeholder: "Discussion title", 
                                    value: newDiscussion.title, 
                                    onChange: (e) => handleInputChange(e, 'title')
                                }
                            ),
                            React.createElement(Textarea, 
                                { 
                                    placeholder: "Share your thoughts or questions...", 
                                    value: newDiscussion.content, 
                                    onChange: (e) => handleInputChange(e, 'content')
                                }
                            ),
                            React.createElement(Input, 
                                { 
                                    placeholder: "Add tags (comma-separated)", 
                                    onChange: (e) => handleInputChange(e, 'tags')
                                }
                            ),
                            React.createElement(Button, 
                                { 
                                    onClick: createDiscussion, 
                                    disabled: !newDiscussion.title || !newDiscussion.content },
                                isSubmitting ? 'Posting...' : 'Post Discussion'
                            )
                        )
                    )
                )
            ),
            React.createElement('div', 
                { className: "grid grid-cols-3 gap-8" },
                React.createElement('div', 
                    { className: "col-span-2 space-y-6" },
                    React.createElement('div', 
                        { className: "relative" },
                        React.createElement(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" }),
                        React.createElement(Input, 
                            { 
                                type: "search", 
                                placeholder: "Search discussions...", 
                                className: "pl-10", 
                                value: searchTerm,
                                onChange: (e) => setSearchTerm(e.target.value)
                            }
                        )
                    ),
                    discussions
                        .filter((discussion: any) => 
                            discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            discussion.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            discussion.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map((discussion: any) => (
                            React.createElement(Card, { key: discussion.id, className: "p-6" },
                                React.createElement('div', 
                                    { className: "flex items-start justify-between mb-4" },
                                    React.createElement('div', 
                                        { className: "flex items-center gap-3" },
                                        React.createElement(Avatar, {},
                                            React.createElement(AvatarImage, { src: discussion.authorAvatar, alt: discussion.authorName }),
                                            React.createElement(AvatarFallback, {}, discussion.authorName[0])
                                        ),
                                        React.createElement('div', {},
                                            React.createElement('h3', { className: "font-semibold" }, discussion.title),
                                            React.createElement('p', { className: "text-sm text-gray-400" },
                                                discussion.authorName, ' • ', new Date(discussion.createdAt).toLocaleDateString()
                                            )
                                        )
                                    ),
                                    React.createElement('div', 
                                        { className: "flex items-center gap-2" },
                                        React.createElement(Button, { variant: "ghost", size: "sm", className: "gap-1" },
                                            React.createElement(ThumbsUp, { className: "w-4 h-4" }),
                                            discussion.likes
                                        ),
                                        React.createElement(Button, { variant: "ghost", size: "sm", className: "gap-1" },
                                            React.createElement(MessageSquare, { className: "w-4 h-4" }),
                                            discussion.replies.length
                                        ),
                                        React.createElement(Button, { variant: "ghost", size: "sm" },
                                            React.createElement(Share2, { className: "w-4 h-4" })
                                        )
                                    )
                                ),
                                React.createElement('p', { className: "mb-4" }, discussion.content),
                                React.createElement('div', { className: "flex flex-wrap gap-2" },
                                    discussion.tags.map((tag: any) => (
                                        React.createElement(Badge, { key: tag, variant: "secondary" }, tag)
                                    ))
                                )
                            )
                        )
                    )
                ),
                React.createElement('div', 
                    { className: "space-y-6" },
                    React.createElement('h2', { className: "text-xl font-semibold" }, 'Study Groups'),
                    studyGroups.map((group: any) => (
                        React.createElement(Card, { key: group.id, className: "p-6" },
                            React.createElement('div', 
                                { className: "flex items-start justify-between mb-4" },
                                React.createElement('div', {},
                                    React.createElement('h3', { className: "font-semibold" }, group.name),
                                    React.createElement('p', { className: "text-sm text-gray-400 mb-2" }, group.description)
                                ),
                                React.createElement(Button, 
                                    { 
                                        variant: "outline", 
                                        size: "sm",
                                        onClick: () => joinStudyGroup(group.id),
                                        disabled: group.members.some(member => member.id === userId)
                                    },
                                    group.members.some(member => member.id === userId) ? 'Joined' : 'Join'
                                )
                            ),
                            React.createElement('div', 
                                { className: "flex items-center gap-4 text-sm text-gray-400 mb-4" },
                                React.createElement('div', 
                                    { className: "flex items-center gap-1" },
                                    React.createElement(Users, { className: "w-4 h-4" }),
                                    group.members.length, ' members'
                                ),
                                React.createElement('div', 
                                    { className: "flex items-center gap-1" },
                                    React.createElement(BookOpen, { className: "w-4 h-4" }),
                                    group.topics.length, ' topics'
                                )
                            ),
                            group.meetingSchedule && (
                                React.createElement('div', 
                                    { className: "flex items-center gap-2 text-sm" },
                                    React.createElement(Calendar, { className: "w-4 h-4 text-gray-400" }),
                                    React.createElement('span', {},
                                        'Meets ', group.meetingSchedule.frequency, ' on ', group.meetingSchedule.day, ' at ', group.meetingSchedule.time
                                    )
                                )
                            )
                        )
                    ))
                )
            )
        )
    );
}
