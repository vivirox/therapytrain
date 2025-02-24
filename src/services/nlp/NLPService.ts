import { singleton } from 'tsyringe';
import { OpenAI } from 'openai';
import { env } from '@/env.mjs';

@singleton()
export class NLPService {
  private static instance: NLPService;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  }

  public static getInstance(): NLPService {
    if (!NLPService.instance) {
      NLPService.instance = new NLPService();
    }
    return NLPService.instance;
  }

  public async analyzeSentiment(text: string): Promise<{
    positive: number;
    neutral: number;
    negative: number;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze the sentiment of the following text and return scores for positive, neutral, and negative sentiment that sum to 1.0.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      positive: result.positive || 0,
      neutral: result.neutral || 0,
      negative: result.negative || 0
    };
  }

  public async analyzeEmotions(text: string): Promise<Record<string, number>> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an emotion analysis expert. Analyze the emotional content of the following text and return intensity scores (0-1) for each detected emotion.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  public async assessUnderstanding(text: string): Promise<{
    conceptGrasp: number;
    taskClarity: number;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a comprehension assessment expert. Analyze the following text and evaluate the level of concept understanding and task clarity on a scale of 0-1.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      conceptGrasp: result.conceptGrasp || 0,
      taskClarity: result.taskClarity || 0
    };
  }

  public async analyzeTherapeuticContent(text: string): Promise<{
    techniques: string[];
    effectiveness: number;
    appropriateness: number;
    clientResponse: number;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a therapeutic content analysis expert. Analyze the following text and identify therapeutic techniques used, their effectiveness, appropriateness, and client response on a scale of 0-1.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      techniques: result.techniques || [],
      effectiveness: result.effectiveness || 0,
      appropriateness: result.appropriateness || 0,
      clientResponse: result.clientResponse || 0
    };
  }

  public async analyzeTherapeuticAlliance(text: string): Promise<{
    bondStrength: number;
    goalAlignment: number;
    taskAgreement: number;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a therapeutic alliance assessment expert. Analyze the following text and evaluate the therapeutic bond strength, goal alignment, and task agreement on a scale of 0-1.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      bondStrength: result.bondStrength || 0,
      goalAlignment: result.goalAlignment || 0,
      taskAgreement: result.taskAgreement || 0
    };
  }

  public async analyzeRiskIndicators(text: string): Promise<{
    riskLevel: number;
    riskTypes: string[];
    urgency: number;
    recommendations: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical risk assessment expert. Analyze the following text for potential risks, their severity, urgency, and provide recommendations.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      riskLevel: result.riskLevel || 0,
      riskTypes: result.riskTypes || [],
      urgency: result.urgency || 0,
      recommendations: result.recommendations || []
    };
  }

  public async analyzeProgressIndicators(text: string): Promise<{
    progressLevel: number;
    areas: Record<string, number>;
    insights: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a therapeutic progress assessment expert. Analyze the following text for indicators of progress, evaluate different areas of improvement, and provide insights.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      progressLevel: result.progressLevel || 0,
      areas: result.areas || {},
      insights: result.insights || []
    };
  }

  public async analyzeInterventionEffectiveness(text: string): Promise<{
    effectiveness: number;
    appropriateness: number;
    clientResponse: number;
    recommendations: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a therapeutic intervention assessment expert. Analyze the following text to evaluate intervention effectiveness, appropriateness, client response, and provide recommendations.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      response_format: { type: 'json' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      effectiveness: result.effectiveness || 0,
      appropriateness: result.appropriateness || 0,
      clientResponse: result.clientResponse || 0,
      recommendations: result.recommendations || []
    };
  }
} 