import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, FileText, User, Brain, AlertCircle, Activity } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatSidebarProps {
  client: {
    name: string;
    age: number;
    primary_issue: string;
    complexity: string;
    description: string;
    key_traits?: Array<string>;
    background?: string;
  };
}

const ChatSidebar = ({ client }: ChatSidebarProps) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [notes, setNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-80 h-full bg-[#1A1A1D] border-l border-gray-800 flex flex-col">
      {/* Timer */}
      <div className="p-4 border-b border-gray-800 bg-[#222225]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="text-lg font-semibold text-white">Session Timer</span>
          </div>
          <span className="text-xl font-mono text-blue-500">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Client Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">{client.name}</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-400">Age:</span> {client.age}</p>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <p>{client.primary_issue}</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className={`px-2 py-1 rounded-full text-xs ${
                client.complexity === 'High' ? 'bg-red-500/20 text-red-300' :
                client.complexity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-green-500/20 text-green-300'
              }`}>
                {client.complexity} Complexity
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">Background</h3>
          <p className="text-sm text-gray-300">{client.background}</p>
        </div>

        {client.key_traits && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Key Traits</h3>
            <div className="flex flex-wrap gap-2">
              {client.key_traits.map((trait, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-300"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">Training Objectives</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              Practice active listening and empathy
            </li>
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              Identify underlying emotional patterns
            </li>
            <li className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              Apply appropriate therapeutic techniques
            </li>
          </ul>
        </div>
      </div>

      {/* Notes Section */}
      <Collapsible 
        open={isNotesOpen} 
        onOpenChange={setIsNotesOpen}
        className="border-t border-gray-800"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-[#222225]">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-white">Session Notes</span>
          </div>
          {isNotesOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Take notes during your session..."
            className="min-h-[150px] bg-[#222225] border-gray-700 text-white"
          />
          <Button 
            className="w-full bg-blue-500 hover:bg-blue-600"
            onClick={() => console.log('Save notes:', notes)}
          >
            Save Notes
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ChatSidebar;