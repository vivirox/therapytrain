import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Intervention } from '@/types/clientprofile';
import { InterventionTrackerProps } from '@/types/componentprops';

const InterventionTracker: React.FC<InterventionTrackerProps> = ({ sessionId, onEffectivenessUpdate }) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        const response = await fetch(`/api/interventions?sessionId=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch interventions');
        const data = await response.json();
        setInterventions(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchInterventions();
  }, [sessionId]);

  const handleEffectivenessChange = async (interventionId: string, value: number) => {
    try {
      const response = await fetch(`/api/interventions/${interventionId}/effectiveness`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ effectiveness: value }),
      });

      if (!response.ok) throw new Error('Failed to update effectiveness');

      setInterventions(prevInterventions =>
        prevInterventions.map((intervention: any) =>
          intervention.id === interventionId
            ? { ...intervention, effectiveness_rating: value }
            : intervention
        )
      );

      onEffectivenessUpdate(value);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  if (loading) return <div>Loading interventions...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!interventions.length) return <div>No interventions recorded for this session.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Intervention Tracking</h2>
      <div className="grid gap-4">
        {interventions.map((intervention: any) => (
          <Card key={intervention.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{intervention.type}</h3>
                <p className="text-sm text-gray-600">{intervention.description}</p>
              </div>
              <Badge 
                variant={
                  intervention.client_response?.emotionalShift === 'positive' ? 'success' :
                  intervention.client_response?.emotionalShift === 'negative' ? 'destructive' :
                  'secondary'
                }
              >
                {intervention.client_response?.emotionalShift || 'No response'}
              </Badge>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Effectiveness Rating: {intervention.effectiveness_rating || 'Not rated'}
              </label>
              <Slider
                defaultValue={[intervention.effectiveness_rating || 0]}
                max={10}
                step={1}
                onValueChange={([value]) => handleEffectivenessChange(intervention.id, value)}
              />
            </div>

            {intervention.follow_up_notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">{intervention.follow_up_notes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InterventionTracker;
