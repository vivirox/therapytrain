import React from 'react';
import { Card } from './ui/card';
import { MdPsychology as Brain } from 'react-icons/md';

interface ContextualHintsProps {
  hints: string[];
  className?: string;
}

const ContextualHints: React.FC<ContextualHintsProps> = ({ hints, className = '' }) => {
  if (hints.length === 0) return null;

  return (
    <Card className={`p-4 bg-blue-500/10 border-blue-500/20 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-medium text-blue-500">Contextual Insights</h3>
      </div>
      <ul className="space-y-1">
        {hints.map((hint, index) => (
          <li key={index} className="text-sm text-gray-300">
            • {hint}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default ContextualHints;
