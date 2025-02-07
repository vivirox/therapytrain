import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PeerReviewProps } from '@/types/ComponentProps';

const PeerReview: React.FC<PeerReviewProps> = ({ sessionId, therapistId, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const areas = [
    'Therapeutic Alliance',
    'Intervention Choice',
    'Timing',
    'Cultural Competence',
    'Goal Alignment',
    'Crisis Management',
    'Documentation',
    'Ethics',
  ];

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area)
        ? prev.filter((a: any) => a !== area)
        : [...prev, area]
    );
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      setError(new Error('Please provide feedback'));
      return;
    }

    if (selectedAreas.length === 0) {
      setError(new Error('Please select at least one area'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const review = {
        rating,
        feedback,
        areas: selectedAreas,
      };

      await onSubmitReview(review);
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit review'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(5);
    setFeedback('');
    setSelectedAreas([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-2xl font-bold mb-4">Peer Review</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Overall Rating: {rating}/10
            </label>
            <Slider
              value={[rating]}
              onValueChange={([value]) => setRating(value)}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Areas of Focus
            </label>
            <div className="flex flex-wrap gap-2">
              {areas.map((area: any) => (
                <Badge
                  key={area}
                  variant={selectedAreas.includes(area) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Detailed Feedback
            </label>
            <Textarea
              placeholder="Share your professional feedback..."
              value={feedback}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error.message}
            </div>
          )}

          <Button
            onClick={() => setIsDialogOpen(true)}
            disabled={isSubmitting}
            className="w-full"
          >
            Submit Review
          </Button>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Review Submission</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>Are you sure you want to submit this peer review? This action cannot be undone.</p>
            
            <div className="mt-4 space-y-2">
              <p><strong>Rating:</strong> {rating}/10</p>
              <p><strong>Areas:</strong> {selectedAreas.join(', ')}</p>
              <p><strong>Feedback:</strong> {feedback}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeerReview;
