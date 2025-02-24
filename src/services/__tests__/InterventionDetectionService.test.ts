import { InterventionDetectionService, Intervention, InterventionType } from '../InterventionDetectionService';
import { InterventionOptimizationSystem } from '../interventionOptimization';
import { SessionAnalytics } from '../sessionAnalytics';

// Mock dependencies
jest.mock('../interventionOptimization');
jest.mock('../sessionAnalytics');

describe('InterventionDetectionService', () => {
    let service: InterventionDetectionService;
    let mockContext: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Initialize service
        service = InterventionDetectionService.getInstance();

        // Setup mock context
        mockContext = {
            clientState: {
                emotionalState: 0,
                engagementLevel: 0.8,
                currentTopics: ['anxiety', 'depression']
            },
            sessionState: {
                duration: 1800,
                interventionCount: 3,
                recentInterventions: ['cognitive-restructuring', 'validation']
            },
            therapeuticRelationship: {
                alliance: 0.85,
                resistance: 0.2,
                rapport: 0.9
            }
        };
    });

    describe('detectIntervention', () => {
        it('should detect cognitive restructuring intervention', async () => {
            const message = "Let's think about it differently and examine the evidence for this thought.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result).toBeTruthy();
            expect(result?.type).toBe('cognitive-restructuring');
            expect(result?.description).toBe(message);
            expect(result?.targetOutcome).toBe('Modify negative thought patterns');
        });

        it('should detect behavioral activation intervention', async () => {
            const message = "Let's create a schedule of activities that you might enjoy.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result).toBeTruthy();
            expect(result?.type).toBe('behavioral-activation');
            expect(result?.description).toBe(message);
            expect(result?.targetOutcome).toBe('Increase engagement in positive activities');
        });

        it('should detect mindfulness intervention', async () => {
            const message = "Let's focus on the present moment and notice your breath.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result).toBeTruthy();
            expect(result?.type).toBe('mindfulness');
            expect(result?.description).toBe(message);
            expect(result?.targetOutcome).toBe('Improve present-moment awareness');
        });

        it('should return null for non-intervention messages', async () => {
            const message = "How are you feeling today?";
            const result = await service.detectIntervention(message, mockContext);

            expect(result).toBeNull();
        });

        it('should emit intervention:detected event', async () => {
            const message = "Let's reframe that thought and look for evidence.";
            const eventHandler = jest.fn();
            service.on('intervention:detected', eventHandler);

            const result = await service.detectIntervention(message, mockContext);

            expect(eventHandler).toHaveBeenCalledWith(result);
        });
    });

    describe('trackEffectiveness', () => {
        let intervention: Intervention;

        beforeEach(async () => {
            const message = "Let's examine the evidence for this thought.";
            intervention = (await service.detectIntervention(message, mockContext))!;
        });

        it('should track effectiveness metrics', async () => {
            const metrics = {
                clientEngagement: 0.8,
                emotionalShift: 0.6,
                goalProgress: 0.7,
                behavioralChange: 0.5
            };

            await service.trackEffectiveness(intervention.id, metrics);

            // Calculate expected score based on weights
            const expectedScore = 
                0.8 * 0.25 + // clientEngagement
                0.6 * 0.25 + // emotionalShift
                0.7 * 0.3 +  // goalProgress
                0.5 * 0.2;   // behavioralChange

            const updatedIntervention = await (service as any).getIntervention(intervention.id);
            expect(updatedIntervention.effectiveness).toBeCloseTo(expectedScore);
        });

        it('should emit effectiveness_updated event', async () => {
            const metrics = {
                clientEngagement: 0.8,
                emotionalShift: 0.6,
                goalProgress: 0.7,
                behavioralChange: 0.5
            };

            const eventHandler = jest.fn();
            service.on('intervention:effectiveness_updated', eventHandler);

            await service.trackEffectiveness(intervention.id, metrics);

            expect(eventHandler).toHaveBeenCalled();
            expect(eventHandler.mock.calls[0][0]).toHaveProperty('interventionId', intervention.id);
            expect(eventHandler.mock.calls[0][0]).toHaveProperty('effectiveness');
        });
    });

    describe('generateRecommendations', () => {
        beforeEach(() => {
            (InterventionOptimizationSystem.getInstance as jest.Mock).mockReturnValue({
                recommendIntervention: jest.fn().mockResolvedValue([
                    {
                        type: 'cognitive-restructuring',
                        confidence: 0.85,
                        reasoning: 'High anxiety levels indicate potential cognitive distortions'
                    },
                    {
                        type: 'mindfulness',
                        confidence: 0.75,
                        reasoning: 'Could help with emotional regulation'
                    }
                ])
            });
        });

        it('should generate intervention recommendations', async () => {
            const recommendations = await service.generateRecommendations(mockContext);

            expect(recommendations).toHaveLength(2);
            expect(recommendations[0]).toHaveProperty('type', 'cognitive-restructuring');
            expect(recommendations[0]).toHaveProperty('confidence', 0.85);
            expect(recommendations[1]).toHaveProperty('type', 'mindfulness');
            expect(recommendations[1]).toHaveProperty('confidence', 0.75);
        });

        it('should pass correct context to optimization system', async () => {
            const optimizationSystem = InterventionOptimizationSystem.getInstance();
            await service.generateRecommendations(mockContext);

            expect(optimizationSystem.recommendIntervention).toHaveBeenCalledWith(
                'current_session',
                {
                    emotionalState: mockContext.clientState.emotionalState,
                    engagementLevel: mockContext.clientState.engagementLevel,
                    recentTopics: mockContext.clientState.currentTopics
                }
            );
        });
    });

    describe('pattern detection', () => {
        it('should detect validation patterns', async () => {
            const message = "I understand that this feels overwhelming, and it's completely valid to feel this way.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result?.type).toBe('validation');
        });

        it('should detect psychoeducation patterns', async () => {
            const message = "Research shows that anxiety is a common experience and typically involves physical symptoms.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result?.type).toBe('psychoeducation');
        });

        it('should detect skills training patterns', async () => {
            const message = "Let's practice this relaxation technique together.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result?.type).toBe('skills-training');
        });

        it('should detect crisis intervention patterns', async () => {
            const message = "I'm concerned about your safety right now. Let's focus on immediate steps to help you.";
            const result = await service.detectIntervention(message, mockContext);

            expect(result?.type).toBe('crisis-intervention');
        });

        it('should handle multiple patterns in the same message', async () => {
            const message = "I understand this is difficult (validation), and let's practice some techniques (skills) to help manage these thoughts (cognitive).";
            const result = await service.detectIntervention(message, mockContext);

            // Should detect the most prominent pattern
            expect(result).toBeTruthy();
            expect(['validation', 'skills-training', 'cognitive-restructuring']).toContain(result?.type);
        });
    });
}); 