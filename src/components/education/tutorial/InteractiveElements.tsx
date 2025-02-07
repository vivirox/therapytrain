import React from 'react';
import { Card } from "@/../ui/card";
import { RadioGroup, RadioGroupItem } from "@/../ui/radio-group";
import { Label } from "@/../ui/label";
import { Textarea } from "@/../ui/textarea";
import { MdPsychology as Brain } from 'react-icons/md';

export type Choice = {
    id: string;
    text: string;
    nextNodeId: string;
    feedback: string;
};

export interface DecisionTreeNode {
    id: string;
    content: string;
    choices: Choice[];
}

export interface SimulationScenario {
    setup: string;
    variables: Record<string, string | number | boolean>;
    successCriteria: string[];
}

export interface SimulationConfig {
    type: 'roleplay' | 'decision-tree' | 'simulation';
    data: {
        nodes?: DecisionTreeNode[];
        scenario?: SimulationScenario;
    };
}

export interface SimulationResults {
    steps: string[];
    variables: Record<string, any>;
    success: boolean;
}

export interface DecisionTreeResults {
    type: 'decision-tree';
    path: string[];
}

export type InteractionResults = SimulationResults | DecisionTreeResults;

export interface InteractiveElementProps {
    config: SimulationConfig;
    onComplete: (results: InteractionResults) => void;
    onProgress: (progress: number) => void;
    className?: string;
}

interface DecisionTreeElementProps {
    nodes: DecisionTreeNode[];
    onComplete: (path: string[]) => void;
    className?: string;
}

const DecisionTreeElement: React.FC<DecisionTreeElementProps> = ({ nodes, onComplete }) => {
    const [currentNode, setCurrentNode] = React.useState<DecisionTreeNode>(nodes[0]);
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
            return;
        }
        onComplete(path);
    };

    return (
        <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Decision Point</h3>
            </div>

            <p className="text-gray-300 mb-4">{currentNode.content}</p>

            <RadioGroup value={selectedChoice} onValueChange={handleChoice} className="space-y-2">
                {currentNode.choices.map((choice: any) => (
                    <div key={choice.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={choice.id} id={choice.id} />
                        <Label htmlFor={choice.id}>{choice.text}</Label>
                    </div>
                ))}
            </RadioGroup>
        </Card>
    );
};

interface SimulationElementProps {
    config: SimulationScenario;
    onProgress: (progress: number) => void;
    onComplete: (results: SimulationResults) => void;
    className?: string;
}

const SimulationElement: React.FC<SimulationElementProps> = ({ config, onProgress, onComplete }) => {
    const [variables, setVariables] = React.useState<Record<string, any>>(config?.variables || {});
    const [steps, setSteps] = React.useState<string[]>([]);

    const updateSimulation = (action: string) => {
        setSteps(prev => [...prev, action]);
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

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            e.preventDefault();
            updateSimulation(e.currentTarget.value.trim());
            e.currentTarget.value = '';
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
                    {Object.entries(variables).map(([key, value]: any) => (
                        <div key={key} className="p-2 bg-gray-800 rounded">
                            <Label>{key}</Label>
                            <div className="font-mono">{String(value)}</div>
                        </div>
                    ))}
                </div>

                <Textarea 
                    placeholder="Enter your action..." 
                    className="mt-4" 
                    onKeyPress={handleKeyPress}
                />
            </div>
        </Card>
    );
};

export const InteractiveElement: React.FC<InteractiveElementProps> = ({ config, onComplete, onProgress }) => {
    switch (config.type) {
        case 'decision-tree':
            return config.data.nodes ? (
                <DecisionTreeElement 
                    nodes={config.data.nodes} 
                    onComplete={(path) => onComplete({ type: 'decision-tree', path })}
                />
            ) : null;
        case 'simulation':
            return config.data.scenario ? (
                <SimulationElement 
                    config={config.data.scenario} 
                    onProgress={onProgress} 
                    onComplete={onComplete}
                />
            ) : null;
        default:
            return (
                <Card className="p-6">
                    <p>Unsupported interactive element type: {config.type}</p>
                </Card>
            );
    }
};
