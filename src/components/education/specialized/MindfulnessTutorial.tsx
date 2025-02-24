import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/ui/card';
import { Button } from '@/ui/button';
import { Progress } from '@/ui/progress';
import { Slider } from '@/ui/slider';
import { Badge } from '@/ui/badge';
import { MdPlayArrow as Play, MdPause as Pause, MdVolumeUp as Volume2, MdVolumeOff as VolumeX, MdAir as Wind, MdNightlight as Moon, MdWbSunny as Sun, MdFavorite as Heart, MdMonitor as Activity, MdAccessTime as Clock, MdAutoAwesome as Sparkles } from 'react-icons/md';
import { AnalyticsService } from '@/services/analytics';

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

interface MindfulnessNote {
    time: number;
    note: string;
}

interface MindfulnessTutorialProps {
    userId: string;
    exerciseId: string;
    onComplete: () => void;
    className?: string;
}

export const MindfulnessTutorial: React.FC<MindfulnessTutorialProps> = ({ userId, exerciseId, onComplete }) => {
    const [exercise, setExercise] = useState<MindfulnessExercise | null>(null);
    const [currentPhase, setCurrentPhase] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.7);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [biometrics, setBiometrics] = useState<BiometricData>({
        calmness: 50,
        focus: 50
    });
    const [breathCount, setBreathCount] = useState<number>(0);
    const [ambientSoundLevel, setAmbientSoundLevel] = useState<number>(0.3);
    const [guidanceVolume, setGuidanceVolume] = useState<number>(0.7);
    const [visualizationScale, setVisualizationScale] = useState<number>(1);
    const [userNotes, setUserNotes] = useState<MindfulnessNote[]>([]);
    const [progress, setProgress] = useState(0);
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
    const animationRef = useRef<any>(null);
    const [isBreathing, setIsBreathing] = useState(false);

    const steps = [
        {
            title: 'Introduction to Mindful Breathing',
            content: 'Welcome to the mindful breathing exercise. Find a comfortable position and prepare to focus on your breath.',
        },
        {
            title: 'Basic Breathing Technique',
            content: 'Inhale slowly through your nose for 4 counts, hold for 4, then exhale for 4. Click start when ready.',
        },
        {
            title: 'Body Awareness',
            content: 'As you breathe, notice any sensations in your body. Where do you feel the breath most prominently?',
        },
        {
            title: 'Thought Observation',
            content: 'If thoughts arise, acknowledge them without judgment and gently return focus to your breath.',
        },
        {
            title: 'Completion',
            content: 'Well done! You\'ve completed the mindful breathing exercise. Take a moment to reflect on your experience.',
        },
    ];

    useEffect(() => {
        const fetchExercise = async () => {
            try {
                const response = await fetch(`/api/mindfulness-exercises/${exerciseId}`);
                if (response.ok) {
                    const data = await response.json();
                    setExercise(data);
                    initializeAudioTracks(data.phases[0].audio);
                }
            }
            catch (error) {
                console.error('Error fetching mindfulness exercise:', error);
            }
        };
        fetchExercise();
    }, [exerciseId]);

    useEffect(() => {
        if (!exercise || !isPlaying)
            return;
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

    useEffect(() => {
        if (isBreathing) {
            const timer = setInterval(() => {
                setBreathCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 10) {
                        setIsBreathing(false);
                        return 0;
                    }
                    return newCount;
                });
            }, 12000); // Complete breath cycle (4s in, 4s hold, 4s out)

            return () => clearInterval(timer);
        }
    }, [isBreathing]);

    useEffect(() => {
        setProgress((currentPhase / (exercise?.phases.length - 1 || 0)) * 100);
    }, [currentPhase, exercise?.phases.length]);

    const initializeAudioTracks = (tracks: AudioTrack[]) => {
        tracks.forEach((track: any) => {
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
        if (!exercise)
            return;
        if (currentPhase < exercise.phases.length - 1) {
            setCurrentPhase(prev => prev + 1);
            setCurrentTime(0);
            updateAudioTracks(exercise.phases[currentPhase + 1].audio);
        }
        else {
            handleComplete();
        }
    };

    const updateAudioTracks = (newTracks: AudioTrack[]) => {
        Object.values(audioRefs.current).forEach((audio: any) => {
            audio.pause();
        });
        newTracks.forEach((track: any) => {
            const audio = audioRefs.current[track.type];
            if (audio) {
                audio.volume = track.type === 'guidance' ? guidanceVolume : ambientSoundLevel;
                if (isPlaying)
                    audio.play();
            }
        });
    };

    const togglePlayback = () => {
        setIsPlaying(!isPlaying);
        if (!exercise)
            return;
        const tracks = exercise.phases[currentPhase].audio;
        tracks.forEach((track: any) => {
            const audio = audioRefs.current[track.type];
            if (audio) {
                if (!isPlaying) {
                    audio.play();
                }
                else {
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
        }
        else {
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
        const currentTime = Math.floor(Date.now() / 1000);
        setUserNotes(prev => [...prev, { time: currentTime, note }]);
    };

    const handleComplete = () => {
        const results = {
            exerciseId,
            userId,
            duration: currentTime,
            phases: exercise?.phases.length,
            breathCount,
            averageCalmness: biometrics.calmness,
            averageFocus: biometrics.focus,
            notes: userNotes,
            completedAt: new Date()
        };
        // Track completion in analytics
        AnalyticsService.trackTutorialProgress(userId, exerciseId, 100);
        onComplete();
    };

    const handleNext = () => {
        if (currentPhase < steps.length - 1) {
            setCurrentPhase(prev => prev + 1);
            AnalyticsService.trackEvent({
                type: 'tutorial_progress',
                userId,
                timestamp: Date.now(),
                data: {
                    exerciseId,
                    step: currentPhase + 1,
                    totalSteps: steps.length
                }
            });
        } else {
            handleComplete();
        }
    };

    const handleBreathingStart = () => {
        setIsBreathing(true);
        AnalyticsService.trackEvent({
            type: 'breathing_exercise_start',
            userId,
            timestamp: Date.now(),
            data: {
                exerciseId
            }
        });
    };

    if (!exercise) {
        return <div>Loading exercise...</div>;
    }

    const currentPhaseData = exercise.phases[currentPhase];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Progress value={progress} className="mb-6" />

            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">{steps[currentPhase].title}</h2>
                <p className="text-gray-600 mb-6">{steps[currentPhase].content}</p>
                
                {currentPhase === 1 && (
                    <div className="mb-6">
                        {isBreathing ? (
                            <div className="text-center">
                                <div className="text-3xl mb-4">Breath Count: {breathCount}</div>
                                <div className="text-gray-600">Continue breathing...</div>
                            </div>
                        ) : (
                            <Button onClick={handleBreathingStart}>
                                Start Breathing Exercise
                            </Button>
                        )}
                    </div>
                )}

                {currentPhase === 2 && (
                    <div className="mb-6">
                        <textarea
                            className="w-full p-2 border rounded"
                            placeholder="Note your physical sensations here..."
                            onChange={(e) => addUserNote(e.target.value)}
                        />
                    </div>
                )}

                <Button 
                    onClick={handleNext}
                    disabled={currentPhase === 1 && breathCount < 10}
                >
                    {currentPhase < steps.length - 1 ? 'Next' : 'Complete'}
                </Button>
            </Card>

            {userNotes.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-xl font-bold mb-4">Your Notes</h3>
                    <div className="space-y-2">
                        {userNotes.map((note: any, index: any) => (
                            <div key={index} className="p-2 bg-gray-100 rounded">
                                <span className="text-sm text-gray-500">
                                    {new Date(note.time * 1000).toLocaleTimeString()}: 
                                </span>
                                <p>{note.note}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default MindfulnessTutorial;
