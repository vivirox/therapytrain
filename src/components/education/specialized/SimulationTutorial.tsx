import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import {
  MdPlayArrow as Play,
  MdPause as Pause,
  MdRefresh as RotateCcw,
  MdFastForward as FastForward,
  MdFastRewind as Rewind,
  MdVolumeUp as Volume2,
  MdVolumeOff as VolumeX
} from 'react-icons/md';
import { AnalyticsService } from '../../../services/analytics';

interface EmotionalResponse {
  emotion: string;
  intensity: number;
  timestamp: number;
}

interface ClientBehavior {
  behavior: string;
  context: string;
  timestamp: number;
}

interface SimulationScene {
  id: string;
  videoUrl: string;
  duration: number;
  emotionalResponses: EmotionalResponse[];
  clientBehaviors: ClientBehavior[];
  decisionPoints: Array<{
    timestamp: number;
    scenario: string;
    options: Array<{
      text: string;
      outcome: string;
      feedback: string;
      score: number;
    }>;
  }>;
}

interface SimulationTutorialProps {
  userId: string;
  simulationId: string;
  onComplete: (results: any) => void;
}

export const SimulationTutorial: React.FC<SimulationTutorialProps> = ({
  userId,
  simulationId,
  onComplete
}) => {
  const [simulation, setSimulation] = useState<SimulationScene | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentDecision, setCurrentDecision] = useState<any>(null);
  const [userResponses, setUserResponses] = useState<Array<{
    timestamp: number;
    response: string;
    score: number;
  }>>([]);
  const [emotionalInsights, setEmotionalInsights] = useState<Array<{
    timestamp: number;
    insight: string;
  }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        const response = await fetch(`/api/simulations/${simulationId}`);
        if (response.ok) {
          const data = await response.json();
          setSimulation(data);
        }
      } catch (error) {
        console.error('Error fetching simulation:', error);
      }
    };

    fetchSimulation();
  }, [simulationId]);

  useEffect(() => {
    if (!videoRef.current || !simulation) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      checkDecisionPoints(video.currentTime);
      updateEmotionalInsights(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [simulation]);

  const checkDecisionPoints = (time: number) => {
    if (!simulation) return;

    const currentDecisionPoint = simulation.decisionPoints.find(
      point =>
        Math.abs(point.timestamp - time) < 0.5 && // Within half a second
        !userResponses.some(response => response.timestamp === point.timestamp)
    );

    if (currentDecisionPoint) {
      setIsPlaying(false);
      setCurrentDecision(currentDecisionPoint);
    }
  };

  const updateEmotionalInsights = (time: number) => {
    if (!simulation) return;

    const currentEmotions = simulation.emotionalResponses.filter(
      response => Math.abs(response.timestamp - time) < 1
    );

    const currentBehaviors = simulation.clientBehaviors.filter(
      behavior => Math.abs(behavior.timestamp - time) < 1
    );

    if (currentEmotions.length > 0 || currentBehaviors.length > 0) {
      setEmotionalInsights(prev => [
        ...prev,
        {
          timestamp: time,
          insight: generateInsight(currentEmotions, currentBehaviors)
        }
      ]);
    }
  };

  const generateInsight = (
    emotions: EmotionalResponse[],
    behaviors: ClientBehavior[]
  ): string => {
    let insight = '';

    if (emotions.length > 0) {
      const primaryEmotion = emotions.sort((a, b) => b.intensity - a.intensity)[0];
      insight += `Client is showing ${primaryEmotion.emotion} (intensity: ${primaryEmotion.intensity}/10). `;
    }

    if (behaviors.length > 0) {
      insight += behaviors
        .map(b => `Observed behavior: ${b.behavior} in context of ${b.context}`)
        .join('. ');
    }

    return insight;
  };

  const handleDecisionResponse = (option: any) => {
    setUserResponses(prev => [
      ...prev,
      {
        timestamp: currentDecision.timestamp,
        response: option.text,
        score: option.score
      }
    ]);

    // Track the decision in analytics
    AnalyticsService.trackResourceEngagement(userId, simulationId, 'simulation_decision', {
      timestamp: currentDecision.timestamp,
      decision: option.text,
      score: option.score
    });

    setCurrentDecision(null);
    setIsPlaying(true);
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value;
    setVolume(value);
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleSimulationComplete = () => {
    const results = {
      simulationId,
      userId,
      responses: userResponses,
      emotionalInsights,
      averageScore:
        userResponses.reduce((acc, curr) => acc + curr.score, 0) /
        userResponses.length,
      completedAt: new Date()
    };

    // Track completion in analytics
    AnalyticsService.trackTutorialProgress(userId, simulationId, 100);

    onComplete(results);
  };

  if (!simulation) {
    return <div>Loading simulation...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Video Player */}
      <Card className="relative">
        <video
          ref={videoRef}
          src={simulation.videoUrl}
          className="w-full rounded-lg"
        />

        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayback}
                className="w-8 h-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="w-8 h-8 p-0"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]) => handleVolumeChange(value)}
                className="w-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSeek(currentTime - 10)}
                className="w-8 h-8 p-0"
              >
                <Rewind className="w-4 h-4" />
              </Button>
              <span className="text-sm text-white">
                {Math.floor(currentTime)}/{Math.floor(simulation.duration)}s
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSeek(currentTime + 10)}
                className="w-8 h-8 p-0"
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-white">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={e: unknown => handlePlaybackSpeedChange(Number(e.target.value))}
                className="bg-transparent text-white border-none"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          <Slider
            value={[currentTime]}
            min={0}
            max={simulation.duration}
            step={1}
            onValueChange={([value]) => handleSeek(value)}
            className="w-full"
          />
        </div>
      </Card>

      {/* Decision Point */}
      {currentDecision && (
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-semibold">Decision Point</h3>
          <p>{currentDecision.scenario}</p>
          <div className="space-y-2">
            {currentDecision.options.map((option: any) => (
              <Button
                key={option.text}
                variant="outline"
                className="w-full text-left justify-start"
                onClick={() => handleDecisionResponse(option)}
              >
                {option.text}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Emotional Insights */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Emotional Insights</h3>
        <div className="space-y-2">
          {emotionalInsights.slice(-3).map((insight: unknown, index: unknown) => (
            <div
              key={index}
              className="p-3 bg-gray-800 rounded-lg text-sm"
            >
              <span className="text-gray-400">
                {Math.floor(insight.timestamp)}s:{' '}
              </span>
              {insight.insight}
            </div>
          ))}
        </div>
      </Card>

      {/* Complete Button */}
      <Button
        className="w-full"
        onClick={handleSimulationComplete}
        disabled={userResponses.length < simulation.decisionPoints.length}
      >
        Complete Simulation
      </Button>
    </div>
  );
};

export default SimulationTutorial;
