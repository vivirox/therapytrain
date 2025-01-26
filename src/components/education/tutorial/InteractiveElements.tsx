import React from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Brain, MessageSquare, GitBranch } from 'lucide-react';

interface DecisionTreeNode {
  id: string;
  content: string;
  choices: {
    id: string;
    text: string;
    nextNodeId: string;
    feedback: string;
  }[];
}

interface SimulationConfig {
  type: 'roleplay' | 'decision-tree' | 'simulation';
  data: {
    nodes?: DecisionTreeNode[];
    scenario?: {
      setup: string;
      variables: Record<string, any>;
      successCriteria: string[];
    };
  };
}

interface InteractiveElementProps {
  config: SimulationConfig;
  onComplete: (results: any) => void;
  onProgress: (progress: number) => void;
}

const DecisionTreeElement: React.FC<{
  nodes: DecisionTreeNode[];
  onComplete: (path: string[]) => void;
}> = ({ nodes, onComplete }) => {
  const [currentNode, setCurrentNode] = React.useState(nodes[0]);
  const [path, setPath] = React.useState<string[]>([nodes[0].id]);
  const [selectedChoice, setSelectedChoice] = React.useState<string>('');

  const handleChoice = (choiceId: string) => {
    const choice = currentNode.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const nextNode = nodes.find(n => n.id === choice.nextNodeId);
    if (nextNode) {
      setPath([...path, nextNode.id]);
      setCurrentNode(nextNode);
      setSelectedChoice('');
    } else {
      onComplete(path);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Decision Point</h3>
      </div>
      
      <p className="text-gray-300 mb-4">{currentNode.content}</p>

      <RadioGroup
        value={selectedChoice}
        onValueChange={handleChoice}
        className="space-y-2"
      >
        {currentNode.choices.map((choice: { id: any; text: any; }) => (
          <div key={choice.id} className="flex items-center space-x-2">
            <RadioGroupItem value={choice.id} id={choice.id} />
            <Label htmlFor={choice.id}>{choice.text}</Label>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
};

const SimulationElement: React.FC<{
  config: SimulationConfig['data']['scenario'];
  onProgress: (progress: number) => void;
  onComplete: (results: any) => void;
}> = ({ config, onProgress, onComplete }) => {
  const [variables, setVariables] = React.useState(config?.variables || {});
  const [steps, setSteps] = React.useState<string[]>([]);

  const updateSimulation = (action: string) => {
    // Here we would implement the simulation logic
    // For now, we'll just track steps and progress
    setSteps([...steps, action]);
    const progress = Math.min((steps.length + 1) / 5, 1); // Assuming 5 steps for completion
    onProgress(progress);

    if (progress === 1) {
      onComplete({
        steps,
        variables,
        success: true // This would be based on actual success criteria
      });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Interactive Simulation</h3>
      </div>

      <p className="text-gray-300 mb-4">{config?.setup}</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(variables).map(([key, value]) => (
            <div key={key} className="p-2 bg-gray-800 rounded">
              <Label>{key}</Label>
              <div className="font-mono">{value}</div>
            </div>
          ))}
        </div>

        <Textarea
          placeholder="Enter your action..."
          className="mt-4"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              updateSimulation((e.target as HTMLTextAreaElement).value);
              (e.target as HTMLTextAreaElement).value = '';
            }
          }}
        />
      </div>
    </Card>
  );
};

export const InteractiveElement: React.FC<InteractiveElementProps> = ({
  config,
  onComplete,
  onProgress
}) => {
  switch (config.type) {
    case 'decision-tree':
      return (
        <DecisionTreeElement
          nodes={config.data.nodes || []}
          onComplete={(path) => onComplete({ type: 'decision-tree', path })}
        />
      );
    case 'simulation':
      return (
        <SimulationElement
          config={config.data.scenario}
          onProgress={onProgress}
          onComplete={onComplete}
        />
      );
    default:
      return (
        <Card className="p-6">
          <p>Unsupported interactive element type: {config.type}</p>
        </Card>
      );
  }
};
