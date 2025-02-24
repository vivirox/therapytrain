import { TextAnalysisService } from '../../../src/services/TextAnalysisService';
import { SecurityAuditService } from '../../../src/services/SecurityAuditService';
import { EmotionModel } from '../../../src/models/EmotionModel';
import { TherapyTechniqueModel } from '../../../src/models/TherapyTechniqueModel';
import { CrisisDetectionModel } from '../../../src/models/CrisisDetectionModel';

jest.mock('../../../src/models/EmotionModel');
jest.mock('../../../src/models/TherapyTechniqueModel');
jest.mock('../../../src/models/CrisisDetectionModel');

describe('TextAnalysisService', () => {
  let textAnalysisService: TextAnalysisService;
  let mockSecurityAudit: jest.Mocked<SecurityAuditService>;

  beforeEach(() => {
    mockSecurityAudit = {
      recordEvent: jest.fn().mockResolvedValue(undefined)
    } as any;

    (EmotionModel as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      predict: jest.fn().mockResolvedValue({
        primary: 'joy',
        intensity: 0.8
      })
    }));

    (TherapyTechniqueModel as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      predict: jest.fn().mockResolvedValue([{
        identified: ['cognitive_behavioral_therapy'],
        confidence: 0.9
      }])
    }));

    (CrisisDetectionModel as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      predict: jest.fn().mockResolvedValue({
        severity: 'none',
        triggers: [],
        immediateActionRequired: false
      })
    }));

    textAnalysisService = new TextAnalysisService(mockSecurityAudit);
  });

  describe('initialize', () => {
    it('should initialize all models successfully', async () => {
      await textAnalysisService.initialize();
      
      expect(textAnalysisService['emotionModel'].initialize).toHaveBeenCalled();
      expect(textAnalysisService['techniqueModel'].initialize).toHaveBeenCalled();
      expect(textAnalysisService['crisisModel'].initialize).toHaveBeenCalled();
    });
  });

  describe('analyzeText', () => {
    beforeEach(async () => {
      await textAnalysisService.initialize();
    });

    it('should analyze text successfully', async () => {
      const result = await textAnalysisService.analyzeText(
        'I feel much better after our CBT session today.',
        'user123'
      );

      expect(result).toMatchObject({
        emotions: {
          primary: 'joy',
          intensity: 0.8
        },
        therapyTechniques: [{
          identified: ['cognitive_behavioral_therapy'],
          confidence: 0.9
        }],
        crisisIndicators: {
          severity: 'none',
          triggers: [],
          immediateActionRequired: false
        }
      });

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'text_analysis_request',
        expect.any(Object)
      );
    });

    it('should detect HIPAA-sensitive information', async () => {
      const result = await textAnalysisService.analyzeText(
        'Dr. Smith prescribed medication at 123 Medical Drive.',
        'user123'
      );

      expect(result.hipaaCompliance).toEqual({
        containsPHI: true,
        sensitiveElements: ['names', 'address'],
        redactionRequired: true
      });
    });

    it('should extract semantic information correctly', async () => {
      const result = await textAnalysisService.analyzeText(
        'I had a great session with my therapist yesterday. We discussed my anxiety about work.',
        'user123'
      );

      expect(result.semanticAnalysis).toMatchObject({
        mainThemes: expect.arrayContaining(['anxiety', 'work-life']),
        contextualUnderstanding: {
          setting: 'therapy',
          timeframe: 'past',
          relationships: expect.arrayContaining(['my therapist'])
        }
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const error = new Error('Analysis failed');
      jest.spyOn(textAnalysisService['emotionModel'], 'predict')
        .mockRejectedValueOnce(error);

      await expect(textAnalysisService.analyzeText('test', 'user123'))
        .rejects.toThrow(error);

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'text_analysis_error',
        expect.any(Object)
      );
    });

    it('should handle text with no emotions gracefully', async () => {
      jest.spyOn(textAnalysisService['emotionModel'], 'predict').mockResolvedValueOnce({
        primary: 'neutral',
        intensity: 0
      });

      const result = await textAnalysisService.analyzeText(
        'Just a regular day.',
        'user123'
      );

      expect(result.emotions).toEqual({
        primary: 'neutral',
        intensity: 0
      });
    });

    it('should handle text with multiple techniques', async () => {
      jest.spyOn(textAnalysisService['techniqueModel'], 'predict').mockResolvedValueOnce([
        { identified: ['cognitive_behavioral_therapy'], confidence: 0.9 },
        { identified: ['mindfulness_based_therapy'], confidence: 0.8 }
      ]);

      const result = await textAnalysisService.analyzeText(
        'I want to try CBT and mindfulness.',
        'user123'
      );

      expect(result.therapyTechniques).toEqual([
        { identified: ['cognitive_behavioral_therapy'], confidence: 0.9 },
        { identified: ['mindfulness_based_therapy'], confidence: 0.8 }
      ]);
    });

    it('should handle crisis detection correctly', async () => {
      jest.spyOn(textAnalysisService['crisisModel'], 'predict').mockResolvedValueOnce({
        severity: 'high',
        triggers: ['self_harm'],
        immediateActionRequired: true
      });

      const result = await textAnalysisService.analyzeText(
        'I feel like hurting myself.',
        'user123'
      );

      expect(result.crisisIndicators).toEqual({
        severity: 'high',
        triggers: ['self_harm'],
        immediateActionRequired: true
      });
    });
  });
});
