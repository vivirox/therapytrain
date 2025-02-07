import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { MessageCircle, Users, Star, Flag } from 'lucide-react';
interface PeerReviewComment {
    id: string;
    reviewerId: string;
    reviewerName: string;
    timestamp: Date;
    comment: string;
    category: 'technique' | 'approach' | 'effectiveness' | 'suggestion';
    rating?: number;
    interventionId?: string;
}
interface PeerReviewProps {
    sessionId: string;
    therapistId: string;
    onSubmitReview: (review: Omit<PeerReviewComment, 'id' | 'timestamp'>) => void;
}
const PeerReview: React.FC = ({ sessionId, therapistId, onSubmitReview }) => {
    const [comments, setComments] = useState<PeerReviewComment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<PeerReviewComment['category']>('technique');
    const [rating, setRating] = useState<number>(0);
    const [reviewers, setReviewers] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    useEffect(() => {
        const loadComments = async () => {
            try {
                const response = await fetch(`/api/sessions/${sessionId}/peer-reviews`);
                if (response.ok) {
                    const data = await response.json();
                    setComments(data.comments);
                    setReviewers(new Set(data.comments.map((c: PeerReviewComment) => c.reviewerId)));
                }
            }
            catch (error) {
                console.error('Error loading peer reviews:', error);
            }
        };
        loadComments();
    }, [sessionId]);
    const handleSubmitComment = async () => {
        if (!newComment.trim())
            return;
        setIsSubmitting(true);
        try {
            const review = {
                reviewerId: 'current-user-id', // Replace with actual user ID
                reviewerName: 'Current User', // Replace with actual user name
                comment: newComment,
                category: selectedCategory,
                rating: rating
            };
            await onSubmitReview(review);
            setNewComment('');
            setSelectedCategory('technique');
            setRating(0);
        }
        catch (error) {
            console.error('Error submitting review:', error);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const getCategoryIcon = (category: PeerReviewComment['category']) => {
        switch (category) {
            case 'technique':
                return <MessageCircle className="h-4 w-4"></MessageCircle>;
            case 'approach':
                return <Users className="h-4 w-4"></Users>;
            case 'effectiveness':
                return <Star className="h-4 w-4"></Star>;
            case 'suggestion':
                return <Flag className="h-4 w-4"></Flag>;
        }
    };
    const getCategoryColor = (category: PeerReviewComment['category']) => {
        switch (category) {
            case 'technique':
                return 'bg-purple-100 text-purple-800';
            case 'approach':
                return 'bg-blue-100 text-blue-800';
            case 'effectiveness':
                return 'bg-yellow-100 text-yellow-800';
            case 'suggestion':
                return 'bg-green-100 text-green-800';
        }
    };
    return (<div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Peer Reviews</h3>
          <Badge variant="outline">
            {reviewers.size} Reviewer{reviewers.size !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="space-y-4 mb-6">
          {comments.map((comment) => (<div key={comment.id} className="border-b last:border-0 pb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.reviewerName}</span>
                  <Badge className={getCategoryColor(comment.category)}>
                    <span className="flex items-center gap-1">
                      {getCategoryIcon(comment.category)}
                      {comment.category}
                    </span>
                  </Badge>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(comment.timestamp).toLocaleString()}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">{comment.comment}</p>
              
              {comment.rating && (<div className="flex items-center gap-1">
                  {[...Array(5)].map((_: unknown, i) => (<Star key={i} className={`h-4 w-4 ${i < comment.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}></Star>))}
                </div>)}
            </div>))}
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(['technique', 'approach', 'effectiveness', 'suggestion'] as const).map((category) => (<Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category)} className="flex items-center gap-1">
                {getCategoryIcon(category)}
                {category}
              </Button>))}
          </div>

          <Textarea placeholder="Share your professional feedback..." value={newComment} onChange={(e: unknown) => setNewComment(e.target.value)} className="min-h-[100px]"/>

          {selectedCategory === 'effectiveness' && (<div className="flex items-center gap-2">
              <span className="text-sm">Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (<Button key={value} variant="ghost" size="sm" onClick={() => setRating(value)} className={value <= rating ? 'text-yellow-400' : 'text-gray-300'}>
                    <Star className="h-4 w-4 fill-current"></Star>
                  </Button>))}
              </div>
            </div>)}

          <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()} className="w-full">
            Submit Review
          </Button>
        </div>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            View Review Guidelines
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Peer Review Guidelines</DialogTitle>
            <DialogDescription>
              Follow these guidelines to provide constructive feedback:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Technique Reviews</h4>
              <p className="text-sm text-gray-600">
                Focus on specific therapeutic techniques used, their application, and timing.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Approach Reviews</h4>
              <p className="text-sm text-gray-600">
                Evaluate the overall therapeutic approach and its alignment with client needs.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Effectiveness Reviews</h4>
              <p className="text-sm text-gray-600">
                Assess the impact and outcomes of specific interventions or the session as a whole.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Suggestions</h4>
              <p className="text-sm text-gray-600">
                Provide constructive suggestions for improvement or alternative approaches.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
};
export default PeerReview;
