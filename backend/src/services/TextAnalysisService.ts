import { SecurityAuditService } from "./SecurityAuditService";
import { EmotionModel, EmotionResult } from '../models/EmotionModel';
import { TherapyTechniqueModel, TechniqueResult } from '../models/TherapyTechniqueModel';
import { CrisisDetectionModel, CrisisResult } from '../models/CrisisDetectionModel';

interface TextAnalysisResult {
  emotions: EmotionResult;
  therapyTechniques: TechniqueResult[];
  crisisIndicators: CrisisResult;
  semanticAnalysis: {
    mainThemes: string[];
    keyPhrases: string[];
    contextualUnderstanding: {
      setting: string;
      timeframe: string;
      relationships: string[];
    };
  };
  hipaaCompliance: {
    containsPHI: boolean;
    sensitiveElements: string[];
    redactionRequired: boolean;
  };
}

export class TextAnalysisService {
  private securityAudit: SecurityAuditService;
  private emotionModel: EmotionModel;
  private techniqueModel: TherapyTechniqueModel;
  private crisisModel: CrisisDetectionModel;

  constructor(securityAudit: SecurityAuditService) {
    this.securityAudit = securityAudit;
    this.emotionModel = new EmotionModel(securityAudit);
    this.techniqueModel = new TherapyTechniqueModel(securityAudit);
    this.crisisModel = new CrisisDetectionModel(securityAudit);
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.emotionModel.initialize(),
      this.techniqueModel.initialize(),
      this.crisisModel.initialize()
    ]);
  }

  async analyzeText(text: string, userId: string): Promise<TextAnalysisResult> {
    try {
      await this.securityAudit.recordEvent('text_analysis_request', {
        userId,
        timestamp: Date.now(),
        textLength: text.length
      });

      const [
        emotions,
        therapyTechniques,
        crisisIndicators,
        semanticAnalysis,
        hipaaCompliance
      ] = await Promise.all([
        this.emotionModel.predict(text),
        this.techniqueModel.predict(text),
        this.crisisModel.predict(text),
        this.performSemanticAnalysis(text),
        this.checkHIPAACompliance(text)
      ]);

      return {
        emotions,
        therapyTechniques,
        crisisIndicators,
        semanticAnalysis,
        hipaaCompliance
      };
    } catch (error) {
      await this.securityAudit.recordEvent('text_analysis_error', {
        userId,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  private async performSemanticAnalysis(text: string) {
    const keyPhrases = this.extractKeyPhrases(text);
    const relationships = this.extractRelationships(text);
    const timeframe = this.analyzeTimeframe(text);

    return {
      mainThemes: this.extractThemes(text),
      keyPhrases,
      contextualUnderstanding: {
        setting: this.determineSetting(text),
        timeframe,
        relationships
      }
    };
  }

  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    const quoteMatches = text.match(/"([^"]+)"/g);
    if (quoteMatches) {
      phrases.push(...quoteMatches.map(m => m.slice(1, -1)));
    }

    const emphasisMatches = text.match(/[*_]([^*_]+)[*_]/g);
    if (emphasisMatches) {
      phrases.push(...emphasisMatches.map(m => m.slice(1, -1)));
    }

    return [...new Set(phrases)];
  }

  private extractRelationships(text: string): string[] {
    const relationships: string[] = [];
    const relationshipPatterns = [
      /(?:my|his|her|their)\s+(mother|father|sister|brother|spouse|partner|friend|therapist)/gi,
      /(?:with|and)\s+(?:my|his|her|their)\s+(family|parents|siblings|children)/gi
    ];

    relationshipPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        relationships.push(...matches.map(m => m.trim()));
      }
    });

    return [...new Set(relationships)];
  }

  private analyzeTimeframe(text: string): string {
    const pastTenseIndicators = /(?:was|were|had|did|went|felt|thought)/i;
    const futureTenseIndicators = /(?:will|going to|plan to|want to|hope to)/i;
    
    if (futureTenseIndicators.test(text)) return 'future';
    if (pastTenseIndicators.test(text)) return 'past';
    return 'present';
  }

  private determineSetting(text: string): string {
    const settingIndicators: { [key: string]: RegExp } = {
      'home': /(?:at home|in my house|in my room)/i,
      'work': /(?:at work|in the office|workplace)/i,
      'school': /(?:at school|in class|university|college)/i,
      'therapy': /(?:in therapy|counseling session|therapist's office)/i,
      'public': /(?:in public|outside|street|store|restaurant)/i
    };

    for (const [setting, pattern] of Object.entries(settingIndicators)) {
      if (pattern.test(text)) return setting;
    }

    return 'unknown';
  }

  private extractThemes(text: string): string[] {
    const themes: Set<string> = new Set();
    const themePatterns: { [key: string]: RegExp } = {
      'anxiety': /(?:anxious|worried|nervous|panic|fear)/i,
      'depression': /(?:depressed|sad|hopeless|worthless)/i,
      'relationships': /(?:relationship|marriage|dating|partner)/i,
      'work-life': /(?:work|job|career|professional)/i,
      'self-esteem': /(?:confidence|self-worth|self-esteem)/i,
      'trauma': /(?:trauma|ptsd|abuse|assault)/i,
      'growth': /(?:growth|improvement|progress|goals)/i
    };

    for (const [theme, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(text)) themes.add(theme);
    }

    return Array.from(themes);
  }

  private async checkHIPAACompliance(text: string) {
    const phiPatterns: { [key: string]: RegExp } = {
      'names': /(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/,
      'dates': /\d{2}[-/]\d{2}[-/]\d{2,4}/,
      'phone': /\d{3}[-.)]\d{3}[-.)]\d{4}/,
      'email': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      'ssn': /\d{3}-\d{2}-\d{4}/,
      'address': /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)/i
    };

    const sensitiveElements: string[] = [];
    let containsPHI = false;

    for (const [type, pattern] of Object.entries(phiPatterns)) {
      if (pattern.test(text)) {
        sensitiveElements.push(type);
        containsPHI = true;
      }
    }

    return {
      containsPHI,
      sensitiveElements,
      redactionRequired: containsPHI
    };
  }
}
