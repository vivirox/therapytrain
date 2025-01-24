import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Slider } from '../../ui/slider';
import { Badge } from '../../ui/badge';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wind,
  Moon,
  Sun,
  Heart,
  Activity,
  Clock,
  Sparkles
} from 'lucide-react';
import { AnalyticsService } from '../../../services/analytics';

interface Visualization {
  type: 'breath' | 'nature' | 'abstract';
  animation: string;
  colorScheme: string[];
}

interface AudioTrack {
  type: 'guidance' | 'ambient' | 'binaural';
  url: string;
  duration: number;
}

interface MeditationPhase {
  name: string;
  duration: number;
  guidance: string;
  visualization: Visualization;
  audio: AudioTrack[];
  breathingPattern?: {
    inhale: number;
    hold: number;
    exhale: number;
    rest: number;
  };
}

interface MindfulnessExercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  focus: string[];
  phases: MeditationPhase[];
  objectives: string[];
}

interface BiometricData {
  heartRate?: number;
  breathingRate?: number;
  calmness: number;
  focus: number;
}

interface MindfulnessTutorialProps {
  userId: string;
  exerciseId: string;
  onComplete: (results: any) => void;
}

export const MindfulnessTutorial: React.FC<MindfulnessTutorialProps> = ({
  userId,
  exerciseId,
  onComplete
}) => {
  const [exercise, setExercise] = useState<MindfulnessExercise | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [biometrics, setBiometrics] = useState<BiometricData>({
    calmness: 50,
    focus: 50
  });
  const [breathCount, setBreathCount] = useState(0);
  const [ambientSoundLevel, setAmbientSoundLevel] = useState(0.3);
  const [guidanceVolume, setGuidanceVolume] = useState(0.7);
  const [visualizationScale, setVisualizationScale] = useState(1);
  const [userNotes, setUserNotes] = useState<string[]>([]);

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const animationRef = useRef<any>(null);

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const response = await fetch(`/api/mindfulness-exercises/${exerciseId}`);
        if (response.ok) {
          const data = await response.json();
          setExercise(data);
          initializeAudioTracks(data.phases[0].audio);
        }
      } catch (error) {
        console.error('Error fetching mindfulness exercise:', error);
      }
    };

    fetchExercise();
  }, [exerciseId]);

  useEffect(() => {
    if (!exercise || !isPlaying) return;

    const timer = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 1;
        if (newTime >= exercise.phases[currentPhase].duration) {
          moveToNextPhase();
        }
        return newTime;
      });
      updateBiometrics();
    }, 1000);

    return () => clearInterval(timer);
  }, [exercise, isPlaying, currentPhase]);

  const initializeAudioTracks = (tracks: AudioTrack[]) => {
    tracks.forEach(track => {
      const audio = new Audio(track.url);
      audio.loop = true;
      audio.volume = track.type === 'guidance' ? guidanceVolume : ambientSoundLevel;
      audioRefs.current[track.type] = audio;
    });
  };

  const updateBiometrics = () => {
    // Simulate biometric data updates
    setBiometrics(prev => ({
      ...prev,
      heartRate: Math.floor(70 + Math.random() * 10),
      breathingRate: Math.floor(12 + Math.random() * 4),
      calmness: Math.min(100, prev.calmness + (Math.random() > 0.5 ? 1 : -1)),
      focus: Math.min(100, prev.focus + (Math.random() > 0.5 ? 1 : -1))
    }));
  };

  const moveToNextPhase = () => {
    if (!exercise) return;

    if (currentPhase < exercise.phases.length - 1) {
      setCurrentPhase(prev => prev + 1);
      setCurrentTime(0);
      updateAudioTracks(exercise.phases[currentPhase + 1].audio);
    } else {
      handleComplete();
    }
  };

  const updateAudioTracks = (newTracks: AudioTrack[]) => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
    });

    newTracks.forEach(track => {
      const audio = audioRefs.current[track.type];
      if (audio) {
        audio.volume = track.type === 'guidance' ? guidanceVolume : ambientSoundLevel;
        if (isPlaying) audio.play();
      }
    });
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!exercise) return;

    const tracks = exercise.phases[currentPhase].audio;
    tracks.forEach(track => {
      const audio = audioRefs.current[track.type];
      if (audio) {
        if (!isPlaying) {
          audio.play();
        } else {
          audio.pause();
        }
      }
    });
  };

  const handleVolumeChange = (type: string, value: number) => {
    const audio = audioRefs.current[type];
    if (audio) {
      audio.volume = value;
    }

    if (type === 'guidance') {
      setGuidanceVolume(value);
    } else {
      setAmbientSoundLevel(value);
    }
  };

  const handleBreathTracking = () => {
    setBreathCount(prev => prev + 1);
  };

  const handleVisualizationScale = (scale: number) => {
    setVisualizationScale(scale);
    if (animationRef.current) {
      animationRef.current.style.transform = `scale(${scale})`;
    }
  };

  const addUserNote = (note: string) => {
    setUserNotes(prev => [...prev, { time: currentTime, note }]);
  };

  const handleComplete = () => {
    const results = {
      exerciseId,
      userId,
      duration: currentTime,
      phases: exercise?.phases.length,
      breathCount,
      averageCalmness:
        biometrics.calmness,
      averageFocus: biometrics.focus,
      notes: userNotes,
      completedAt: new Date()
    };

    // Track completion in analytics
    AnalyticsService.trackTutorialProgress(userId, exerciseId, 100);

    onComplete(results);
  };

  if (!exercise) {
    return <div>Loading exercise...</div>;
  }

  const currentPhaseData = exercise.phases[currentPhase];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Exercise Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{exercise.title}</h2>
            <p className="text-gray-400">{exercise.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{exercise.difficulty}</Badge>
            <Badge variant="outline">
              <Clock className="w-4 h-4 mr-1" />
              {exercise.duration}m
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {exercise.focus.map(focus => (
            <Badge key={focus}>{focus}</Badge>
          ))}
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Visualization Area */}
        <Card className="col-span-2 p-6 aspect-video relative overflow-hidden">
          <div
            ref={animationRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `scale(${visualizationScale})`
            }}
          >
            {/* Visualization content based on current phase */}
            <div
              className="w-64 h-64 rounded-full"
              style={{
                background: `radial-gradient(circle at center, ${currentPhaseData.visualization.colorScheme.join(
                  ', '
                )})`,
                animation: currentPhaseData.visualization.animation
              }}
            />
          </div>

          {/* Breathing Guide */}
          {currentPhaseData.breathingPattern && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Inhale: {currentPhaseData.breathingPattern.inhale}s</span>
                <span>Hold: {currentPhaseData.breathingPattern.hold}s</span>
                <span>Exhale: {currentPhaseData.breathingPattern.exhale}s</span>
                <span>Rest: {currentPhaseData.breathingPattern.rest}s</span>
              </div>
            </div>
          )}
        </Card>

        {/* Controls and Metrics */}
        <Card className="p-6 space-y-6">
          {/* Playback Controls */}
          <div className="space-y-4">
            <Button
              onClick={togglePlayback}
              className="w-full flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Begin
                </>
              )}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Guidance Volume</span>
                <Volume2 className="w-4 h-4" />
              </div>
              <Slider
                value={[guidanceVolume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => handleVolumeChange('guidance', value / 100)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ambient Sound</span>
                <Wind className="w-4 h-4" />
              </div>
              <Slider
                value={[ambientSoundLevel * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => handleVolumeChange('ambient', value / 100)}
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <h3 className="font-medium">Current Metrics</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Calmness</span>
                <span>{biometrics.calmness}%</span>
              </div>
              <Progress value={biometrics.calmness} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Focus</span>
                <span>{biometrics.focus}%</span>
              </div>
              <Progress value={biometrics.focus} className="h-2" />
            </div>

            {biometrics.heartRate && (
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>{biometrics.heartRate} BPM</span>
              </div>
            )}

            {biometrics.breathingRate && (
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span>{biometrics.breathingRate} breaths/min</span>
              </div>
            )}
          </div>

          {/* Phase Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Phase {currentPhase + 1} of {exercise.phases.length}</span>
              <span>
                {Math.floor(currentTime / 60)}:
                {(currentTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <Progress
              value={(currentTime / currentPhaseData.duration) * 100}
              className="h-2"
            />
          </div>
        </Card>
      </div>

      {/* Guidance Text */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold">Current Guidance</h3>
        </div>
        <p className="text-lg leading-relaxed">{currentPhaseData.guidance}</p>
      </Card>
    </div>
  );
};

export default MindfulnessTutorial;
