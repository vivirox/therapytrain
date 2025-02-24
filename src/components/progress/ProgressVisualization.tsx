import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProgressVisualizationProps {
  progressMetrics: {
    overall: number;
    byCategory: {
      symptoms: number;
      functioning: number;
      relationships: number;
      coping: number;
    };
    goals: Array<{
      id: string;
      description: string;
      progress: number;
      status: 'not-started' | 'in-progress' | 'completed';
      lastUpdated: Date;
    }>;
    timeline: Array<{
      date: Date;
      score: number;
      milestone: string | null;
    }>;
  };
  treatmentAlignment?: {
    overall: number;
    byComponent: {
      goals: number;
      interventions: number;
      approach: number;
      timing: number;
    };
    recommendations: string[];
  };
}

export const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({
  progressMetrics,
  treatmentAlignment
}) => {
  const timelineData = progressMetrics.timeline.map(point => ({
    date: new Date(point.date).toLocaleDateString(),
    score: point.score * 100,
    milestone: point.milestone
  }));

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Overall Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progress Score</span>
              <span className="text-sm font-medium">
                {Math.round(progressMetrics.overall * 100)}%
              </span>
            </div>
            <Progress value={progressMetrics.overall * 100} />
          </div>
        </div>
      </Card>

      {/* Progress Timeline */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Progress Timeline</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 border rounded shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm">Score: {data.score.toFixed(1)}%</p>
                        {data.milestone && (
                          <p className="text-sm text-gray-600 mt-2">
                            Milestone: {data.milestone}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Progress by Category */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Progress by Category</h3>
        <div className="space-y-4">
          {Object.entries(progressMetrics.byCategory).map(([category, value]) => (
            <div key={category}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium capitalize">{category}</span>
                <span className="text-sm font-medium">
                  {Math.round(value * 100)}%
                </span>
              </div>
              <Progress value={value * 100} />
            </div>
          ))}
        </div>
      </Card>

      {/* Goals Progress */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Treatment Goals</h3>
        <div className="space-y-4">
          {progressMetrics.goals.map(goal => (
            <div key={goal.id} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{goal.description}</p>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(goal.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={
                    goal.status === 'completed'
                      ? 'default'
                      : goal.status === 'in-progress'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {goal.status}
                </Badge>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">
                  {Math.round(goal.progress * 100)}%
                </span>
              </div>
              <Progress value={goal.progress * 100} />
            </div>
          ))}
        </div>
      </Card>

      {/* Treatment Alignment */}
      {treatmentAlignment && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Treatment Plan Alignment</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Alignment</span>
                <span className="text-sm font-medium">
                  {Math.round(treatmentAlignment.overall * 100)}%
                </span>
              </div>
              <Progress value={treatmentAlignment.overall * 100} />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Alignment by Component</h4>
              {Object.entries(treatmentAlignment.byComponent).map(([component, value]) => (
                <div key={component}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{component}</span>
                    <span className="text-sm font-medium">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <Progress value={value * 100} />
                </div>
              ))}
            </div>

            {treatmentAlignment.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {treatmentAlignment.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}; 