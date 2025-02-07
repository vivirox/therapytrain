import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { therapeuticApproaches } from "./models/rubrics";
interface Intervention {
    type: string;
    timestamp: Date;
    content: string;
    approach: string;
    effectiveness: number;
    clientResponse?: {
        content: string;
        emotionalShift: 'positive' | 'negative' | 'neutral';
        defenseLevel: number;
    };
}
interface InterventionTrackerProps {
    sessionId: string;
    onEffectivenessUpdate: (interventionId: string, effectiveness: number) => void;
    className?: string;
}
const InterventionTracker: React.FC = ({ sessionId, onEffectivenessUpdate }) => {
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [activeApproach, setActiveApproach] = useState<string>('');
    const [effectiveness, setEffectiveness] = useState<{
        overall: number;
        byApproach: Record<string, number>;
    }>({
        overall: 0,
        byApproach: {}
    });
    // Load interventions from session
    useEffect(() => {
        const loadInterventions = async () => {
            try {
                const response = await fetch(`/api/sessions/${sessionId}/interventions`);
                if (response.ok) {
                    const data = await response.json();
                    setInterventions(data.interventions);
                    calculateEffectiveness(data.interventions);
                }
            }
            catch (error) {
                console.error('Error loading interventions:', error);
            }
        };
        loadInterventions();
    }, [sessionId]);
    const calculateEffectiveness = (interventions: Intervention[]) => {
        if (interventions.length === 0)
            return;
        const byApproach: Record<string, number[]> = {};
        let totalEffectiveness = 0;
        interventions.forEach(intervention => {
            if (!byApproach[intervention.approach]) {
                byApproach[intervention.approach] = [];
            }
            byApproach[intervention.approach].push(intervention.effectiveness);
            totalEffectiveness += intervention.effectiveness;
        });
        const averageByApproach: Record<string, number> = {};
        Object.entries(byApproach).forEach(([approach, scores]) => {
            averageByApproach[approach] = scores.reduce((a, b) => a + b, 0) / scores.length;
        });
        setEffectiveness({
            overall: totalEffectiveness / interventions.length,
            byApproach: averageByApproach
        });
    };
    const getEffectivenessColor = (score: number) => {
        if (score >= 4)
            return 'text-green-500';
        if (score >= 3)
            return 'text-yellow-500';
        return 'text-red-500';
    };
    const getEffectivenessIcon = (score: number) => {
        if (score >= 4)
            return <CheckCircle className="h-5 w-5"></CheckCircle>;
        if (score >= 3)
            return <AlertTriangle className="h-5 w-5"></AlertTriangle>;
        return <XCircle className="h-5 w-5"></XCircle>;
    };
    return (<div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Intervention Effectiveness</h3>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Effectiveness</span>
            <span className={`flex items-center gap-1 ${getEffectivenessColor(effectiveness.overall)}`}>
              {getEffectivenessIcon(effectiveness.overall)}
              {effectiveness.overall.toFixed(1)}/5
            </span>
          </div>
          <Progress value={effectiveness.overall * 20} className="h-2"></Progress>
        </div>

        <div className="space-y-4">
          {Object.entries(effectiveness.byApproach).map(([approach, score]) => (<div key={approach}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{approach}</span>
                <span className={`flex items-center gap-1 ${getEffectivenessColor(score)}`}>
                  {getEffectivenessIcon(score)}
                  {score.toFixed(1)}/5
                </span>
              </div>
              <Progress value={score * 20} className="h-2"></Progress>
            </div>))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Interventions</h3>
        <div className="space-y-4">
          {interventions.slice(-5).reverse().map((intervention, index) => (<div key={index} className="border-b last:border-0 pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline">{intervention.approach}</Badge>
                <span className="text-sm text-gray-500">
                  {intervention.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              <p className="text-sm mb-2">{intervention.content}</p>
              
              {intervention.clientResponse && (<div className="bg-gray-50 p-2 rounded-md mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Client Response</span>
                    <Badge variant={intervention.clientResponse.emotionalShift === 'positive' ? 'success' :
                    intervention.clientResponse.emotionalShift === 'negative' ? 'destructive' :
                        'secondary'}>
                      {intervention.clientResponse.emotionalShift}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{intervention.clientResponse.content}</p>
                </div>)}
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEffectivenessUpdate(intervention.type, 1)} className={intervention.effectiveness <= 2 ? 'text-red-500' : ''}>
                    <ThumbsDown className="h-4 w-4"></ThumbsDown>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEffectivenessUpdate(intervention.type, 5)} className={intervention.effectiveness >= 4 ? 'text-green-500' : ''}>
                    <ThumbsUp className="h-4 w-4"></ThumbsUp>
                  </Button>
                </div>
                <span className={`text-sm ${getEffectivenessColor(intervention.effectiveness)}`}>
                  Effectiveness: {intervention.effectiveness}/5
                </span>
              </div>
            </div>))}
        </div>
      </Card>
    </div>);
};
export default InterventionTracker;
