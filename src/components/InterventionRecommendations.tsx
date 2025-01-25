import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface InterventionRecommendation {
  interventionType: string;
  confidence: number;
  reasoning: string[];
  expectedOutcomes: string[];
  potentialRisks: string[];
}

interface InterventionRecommendationsProps {
  recommendations: InterventionRecommendation[];
  onSelect?: (interventionType: string) => void;
  className?: string;
}

const InterventionRecommendations: React.FC<InterventionRecommendationsProps> = ({
  recommendations,
  onSelect,
  className = '',
}) => {
  if (recommendations.length === 0) return null;

  return (
    <Card className={`p-4 bg-blue-500/5 border-blue-500/20 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-blue-500" />
        <h3 className="text-base font-medium text-blue-500">
          Recommended Interventions
        </h3>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {recommendations.map((rec, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border border-blue-500/20 rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-2 hover:bg-blue-500/10">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-gray-200">
                  {rec.interventionType}
                </span>
                <Badge
                  variant={getConfidenceBadgeVariant(rec.confidence)}
                  className="ml-2"
                >
                  {Math.round(rec.confidence * 100)}% confidence
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-2 bg-blue-500/5">
              {/* Reasoning Section */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Why this intervention?
                </h4>
                <ul className="space-y-1">
                  {rec.reasoning.map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-400 flex items-start gap-2"
                    >
                      <span className="mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expected Outcomes */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Expected Outcomes
                </h4>
                <ul className="space-y-1">
                  {rec.expectedOutcomes.map((outcome, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-400 flex items-start gap-2"
                    >
                      <span className="mt-1">•</span>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Potential Risks */}
              {rec.potentialRisks.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Consider These Risks
                  </h4>
                  <ul className="space-y-1">
                    {rec.potentialRisks.map((risk, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-400 flex items-start gap-2"
                      >
                        <span className="mt-1">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onSelect && (
                <button
                  onClick={() => onSelect(rec.interventionType)}
                  className="w-full mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Apply Intervention
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
};

const getConfidenceBadgeVariant = (confidence: number) => {
  if (confidence >= 0.8) return 'default';
  if (confidence >= 0.6) return 'secondary';
  return 'destructive';
};

export default InterventionRecommendations;
