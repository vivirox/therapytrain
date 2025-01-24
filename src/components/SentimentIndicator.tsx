import React from 'react';
import { Progress } from "./ui/progress";

interface SentimentIndicatorProps {
  score: number;  // Score from -5 to 5
}

export const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({ score }) => {
  // Convert score from -5 to 5 range to 0 to 100 for progress bar
  const normalizedScore = ((score + 5) / 10) * 100;
  
  // Determine color based on sentiment
  const getColor = (score: number) => {
    if (score < -2) return "bg-red-500";
    if (score < 0) return "bg-orange-500";
    if (score < 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-sm text-gray-400">
        <span>Negative</span>
        <span>Positive</span>
      </div>
      <Progress
        value={normalizedScore}
        className={`h-2 ${getColor(score)}`}
      />
    </div>
  );
};
