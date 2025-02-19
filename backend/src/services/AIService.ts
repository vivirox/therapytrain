import { SecurityAuditService } from "./SecurityAuditService";
import { RateLimiterService } from "./RateLimiterService";
import { TextAnalysisService } from "./TextAnalysisService";

interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIResponse {
  content: string;
  metadata?: {
    sentiment?: number;
    topics?: string[];
    followUpQuestions?: string[];
    textAnalysis?: {
      emotions: {
        primary: string;
        secondary?: string;
        intensity: number;
      };
      therapyTechniques: {
        identified: string[];
        confidence: number;
      }[];
      crisisIndicators: {
        severity: "none" | "low" | "medium" | "high" | "critical";
        triggers: string[];
        immediateActionRequired: boolean;
      };
    };
  };
}

export class AIService {
  private securityAudit: SecurityAuditService;
  private rateLimiter: RateLimiterService;
  private textAnalysis: TextAnalysisService;
  private systemPrompt: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(
    securityAudit: SecurityAuditService,
    rateLimiter: RateLimiterService,
    textAnalysis: TextAnalysisService,
    systemPrompt?: string,
  ) {
    this.securityAudit = securityAudit;
    this.rateLimiter = rateLimiter;
    this.textAnalysis = textAnalysis;
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI assistant focused on providing therapeutic support.
    Your responses should be:
    1. Empathetic and understanding
    2. Professional and ethical
    3. Clear and concise
    4. Safety-focused, especially in crisis situations
    5. Mindful of therapeutic boundaries

    If you detect any concerning content related to self-harm or harm to others,
    immediately provide crisis resources and alert the system.`;
  }

  async processMessage(userId: string, message: string): Promise<AIResponse> {
    try {
      // Rate limiting check
      if (this.rateLimiter.isRateLimited(userId, "ai_request")) {
        throw new Error("Rate limit exceeded for AI requests");
      }
      // Log the request
      this.securityAudit.recordEvent("ai_request", {
        userId,
        timestamp: Date.now(),
        messageLength: message.length,
      });
      // Check for crisis keywords
      if (this.containsCrisisKeywords(message)) {
        return this.handleCrisisSituation(message);
      }
      // Process message with retries
      return await this.processWithRetries(userId, message);
    } catch (error) {
      this.securityAudit.recordEvent("ai_error", {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      });
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  private async processWithRetries(
    userId: string,
    message: string,
  ): Promise<AIResponse> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const messages: AIMessage[] = [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: message },
        ];

        // Perform text analysis in parallel with AI model call
        const [response, textAnalysisResult] = await Promise.all([
          this.callAIModel(messages),
          this.textAnalysis.analyzeText(message, userId),
        ]);

        // Analyze response
        const sentiment = await this.analyzeSentiment(response.content);
        const topics = await this.extractTopics(response.content);

        return {
          content: response.content,
          metadata: {
            sentiment,
            topics,
            followUpQuestions: this.generateFollowUpQuestions(response.content),
            textAnalysis: {
              emotions: textAnalysisResult.emotions,
              therapyTechniques: textAnalysisResult.therapyTechniques,
              crisisIndicators: textAnalysisResult.crisisIndicators,
            },
          },
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelay * attempt),
          );
          continue;
        }
      }
    }
    throw lastError || new Error("Failed to process message after all retries");
  }

  private async callAIModel(messages: AIMessage[]): Promise<{
    content: string;
  }> {
    // TODO: Implement actual AI model integration
    // This is a placeholder that should be replaced with your actual AI model call
    return {
      content: "I understand how you're feeling. Let's explore that further...",
    };
  }

  private containsCrisisKeywords(message: string): boolean {
    const crisisKeywords = [
      "suicide",
      "kill myself",
      "end my life",
      "self-harm",
      "hurt myself",
      "die",
    ];
    return crisisKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  private async handleCrisisSituation(message: string): Promise<AIResponse> {
    const crisisResponse = {
      content: `I'm concerned about what you're expressing and want to make sure you're safe.
      Here are some immediate resources that can help:
      
      - National Crisis Hotline: 988
      - Crisis Text Line: Text HOME to 741741
      - Emergency Services: 911
      
      Would you like to talk more about what's troubling you? I'm here to listen and help connect you with professional support.`,
      metadata: {
        sentiment: -0.8, // Indicating crisis situation
        topics: ["crisis", "mental health", "safety"],
        followUpQuestions: [
          "Are you in a safe place right now?",
          "Would you like help contacting emergency services?",
          "Have you talked to a mental health professional about these feelings?",
        ],
      },
    };
    // Log crisis detection
    this.securityAudit.recordEvent("crisis_detected", {
      timestamp: Date.now(),
      messageContent: message,
    });
    return crisisResponse;
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // TODO: Implement actual sentiment analysis
    // This is a placeholder that should be replaced with actual sentiment analysis
    return 0.0;
  }

  private async extractTopics(text: string): Promise<string[]> {
    // TODO: Implement actual topic extraction
    // This is a placeholder that should be replaced with actual topic extraction
    return ["therapy", "support"];
  }

  private generateFollowUpQuestions(text: string): string[] {
    // TODO: Implement actual follow-up question generation
    // This is a placeholder that should be replaced with actual question generation
    return [
      "How does that make you feel?",
      "Can you tell me more about that?",
      "What thoughts come up when you think about this?",
    ];
  }
}
