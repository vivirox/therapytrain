import { dataService } from "./dataService";
export interface RiskFactor {
    id: string;
    type: 'behavioral' | 'emotional' | 'contextual' | 'historical';
    severity: number; // 0-1
    confidence: number; // 0-1
    description: string;
    timestamp: Date;
    indicators: Array<string>;
}
export interface RiskAssessment {
    overallRisk: number; // 0-1
    urgency: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<RiskFactor>;
    recommendations: Array<string>;
    nextSteps: Array<string>;
    escalationProtocol?: string;
}
export interface AlertConfig {
    threshold: number;
    recipients: Array<string>;
    channels: Array<('email' | 'sms' | 'in-app')>;
    customMessage?: string;
}
class CrisisPrediction {
    private static riskThresholds = {
        low: 0.25,
        medium: 0.5,
        high: 0.75,
        critical: 0.9
    };
    private static riskIndicators = {
        behavioral: [
            'sudden withdrawal',
            'aggressive behavior',
            'self-harm references',
            'substance use mentions',
            'sleep pattern changes'
        ],
        emotional: [
            'extreme mood swings',
            'persistent negative thoughts',
            'hopelessness',
            'emotional numbness',
            'intense anxiety'
        ],
        contextual: [
            'recent loss',
            'relationship conflicts',
            'work stress',
            'financial problems',
            'social isolation'
        ],
        historical: [
            'previous crisis episodes',
            'trauma history',
            'family history',
            'treatment discontinuation',
            'hospitalization history'
        ]
    };
    static async assessRisk(sessionId: string, clientId: string): Promise<RiskAssessment> {
        // Fetch relevant data
        const [sessionData, clientHistory, recentMessages, behavioralPatterns] = await Promise.all([
            this.getSessionData(sessionId),
            this.getClientHistory(clientId),
            this.getRecentMessages(clientId),
            this.getBehavioralPatterns(clientId)
        ]);
        // Analyze different risk factors
        const behavioralFactors = await this.analyzeBehavioralRisk(recentMessages, behavioralPatterns);
        const emotionalFactors = await this.analyzeEmotionalRisk(recentMessages, sessionData);
        const contextualFactors = await this.analyzeContextualRisk(clientHistory, sessionData);
        const historicalFactors = await this.analyzeHistoricalRisk(clientHistory);
        // Combine all risk factors
        const allFactors = [
            ...behavioralFactors,
            ...emotionalFactors,
            ...contextualFactors,
            ...historicalFactors
        ];
        // Calculate overall risk
        const overallRisk = this.calculateOverallRisk(allFactors);
        const urgency = this.determineUrgency(overallRisk);
        // Generate recommendations and next steps
        const recommendations = this.generateRecommendations(allFactors, urgency);
        const nextSteps = this.determineNextSteps(urgency, allFactors);
        const escalationProtocol = urgency === 'high' || urgency === 'critical'
            ? this.getEscalationProtocol(urgency)
            : undefined;
        return {
            overallRisk,
            urgency,
            factors: allFactors,
            recommendations,
            nextSteps,
            escalationProtocol
        };
    }
    static async configureAlerts(clientId: string, config: AlertConfig): Promise<void> {
        const { error } = await dataService
            .upsertAlertConfig({
            client_id: clientId,
            threshold: config.threshold,
            recipients: config.recipients,
            channels: config.channels,
            custom_message: config.customMessage
        });
        if (error) {
            throw new Error(`Failed to configure alerts: ${error.message}`);
        }
    }
    static async triggerAlert(clientId: string, assessment: RiskAssessment): Promise<void> {
        // Get alert configuration
        const { data: config, error } = await dataService
            .getAlertConfig(clientId);
        if (error) {
            throw new Error(`Failed to fetch alert config: ${error.message}`);
        }
        // Check if risk exceeds threshold
        if (assessment.overallRisk >= config.threshold) {
            // Trigger alerts through configured channels
            await Promise.all(config.channels.map(channel, unknown => this.sendAlert(channel, config, assessment)));
            // Log alert
            await this.logAlert(clientId, assessment, config);
        }
    }
    private static async getSessionData(sessionId: string) {
        const { data, error } = await dataService
            .getSessionData(sessionId);
        if (error) {
            throw new Error(`Failed to fetch session data: ${error.message}`);
        }
        return data;
    }
    private static async getClientHistory(clientId: string) {
        const { data, error } = await dataService
            .getClientHistory(clientId);
        if (error) {
            throw new Error(`Failed to fetch client history: ${error.message}`);
        }
        return data;
    }
    private static async getRecentMessages(clientId: string) {
        const { data, error } = await dataService
            .getRecentMessages(clientId);
        if (error) {
            throw new Error(`Failed to fetch messages: ${error.message}`);
        }
        return data;
    }
    private static async getBehavioralPatterns(clientId: string) {
        const { data, error } = await dataService
            .getBehavioralPatterns(clientId);
        if (error) {
            throw new Error(`Failed to fetch patterns: ${error.message}`);
        }
        return data;
    }
    private static async analyzeBehavioralRisk(messages: Array<any>, patterns: Array<any>): Promise<Array<RiskFactor>> {
        const factors: Array<RiskFactor> = [];
        // Analyze message content for behavioral indicators
        for (const indicator of this.riskIndicators.behavioral) {
            const matches = messages.filter(m, unknown => m.content.toLowerCase().includes(indicator));
            if (matches.length > 0) {
                factors.push({
                    id: `behavioral_${indicator}`,
                    type: 'behavioral',
                    severity: matches.length / messages.length,
                    confidence: 0.8,
                    description: `Detected ${indicator} in recent messages`,
                    timestamp: new Date(),
                    indicators: [indicator]
                });
            }
        }
        // Analyze behavioral patterns
        patterns.forEach(pattern, unknown => {
            if (pattern.risk_level > 0.6) {
                factors.push({
                    id: `pattern_${pattern.id}`,
                    type: 'behavioral',
                    severity: pattern.risk_level,
                    confidence: pattern.confidence,
                    description: pattern.description,
                    timestamp: new Date(pattern.timestamp),
                    indicators: pattern.indicators
                });
            }
        });
        return factors;
    }
    private static async analyzeEmotionalRisk(messages: Array<any>, sessionData: any): Promise<Array<RiskFactor>> {
        const factors: Array<RiskFactor> = [];
        // Analyze emotional indicators in messages
        for (const indicator of this.riskIndicators.emotional) {
            const matches = messages.filter(m, unknown => m.content.toLowerCase().includes(indicator));
            if (matches.length > 0) {
                factors.push({
                    id: `emotional_${indicator}`,
                    type: 'emotional',
                    severity: matches.length / messages.length,
                    confidence: 0.7,
                    description: `Frequent expression of ${indicator}`,
                    timestamp: new Date(),
                    indicators: [indicator]
                });
            }
        }
        // Analyze sentiment trends
        if (sessionData.sentiment_trends) {
            const recentSentiments = sessionData.sentiment_trends.slice(-5);
            const avgSentiment = recentSentiments.reduce((a: unknown, b: unknown) => a + b, 0) /
                recentSentiments.length;
            if (avgSentiment < -0.5) {
                factors.push({
                    id: 'emotional_sentiment',
                    type: 'emotional',
                    severity: Math.abs(avgSentiment),
                    confidence: 0.9,
                    description: 'Persistent negative emotional state',
                    timestamp: new Date(),
                    indicators: ['negative sentiment trend']
                });
            }
        }
        return factors;
    }
    private static async analyzeContextualRisk(clientHistory: any, sessionData: any): Promise<Array<RiskFactor>> {
        const factors: Array<RiskFactor> = [];
        // Analyze contextual risk factors
        for (const indicator of this.riskIndicators.contextual) {
            if (sessionData.context_notes?.includes(indicator) ||
                clientHistory.recent_events?.includes(indicator)) {
                factors.push({
                    id: `contextual_${indicator}`,
                    type: 'contextual',
                    severity: 0.7,
                    confidence: 0.6,
                    description: `Recent ${indicator}`,
                    timestamp: new Date(),
                    indicators: [indicator]
                });
            }
        }
        return factors;
    }
    private static async analyzeHistoricalRisk(clientHistory: any): Promise<Array<RiskFactor>> {
        const factors: Array<RiskFactor> = [];
        // Analyze historical risk factors
        for (const indicator of this.riskIndicators.historical) {
            if (clientHistory[indicator]) {
                factors.push({
                    id: `historical_${indicator}`,
                    type: 'historical',
                    severity: 0.8,
                    confidence: 0.9,
                    description: `History of ${indicator}`,
                    timestamp: new Date(),
                    indicators: [indicator]
                });
            }
        }
        return factors;
    }
    private static calculateOverallRisk(factors: Array<RiskFactor>): number {
        if (factors.length === 0) {
            return 0;
        }
        const weights = {
            behavioral: 0.3,
            emotional: 0.3,
            contextual: 0.2,
            historical: 0.2
        };
        const typeScores = Object.entries(weights).map(([type, weight]) => {
            const typeFactors = factors.filter(f => f.type === type);
            if (typeFactors.length === 0) {
                return 0;
            }
            const weightedScores = typeFactors.map(f => f.severity * f.confidence);
            return Math.max(...weightedScores) * weight;
        });
        return typeScores.reduce((a, b) => a + b, 0);
    }
    private static determineUrgency(risk: number): RiskAssessment['urgency'] {
        if (risk >= this.riskThresholds.critical) {
            return 'critical';
        }
        if (risk >= this.riskThresholds.high) {
            return 'high';
        }
        if (risk >= this.riskThresholds.medium) {
            return 'medium';
        }
        return 'low';
    }
    private static generateRecommendations(factors: Array<RiskFactor>, urgency: RiskAssessment['urgency']): Array<string> {
        const recommendations: Array<string> = [];
        // Add urgency-based recommendations
        switch (urgency) {
            case 'critical':
                recommendations.push('Immediate intervention required', 'Consider emergency services contact', 'Implement safety plan immediately');
                break;
            case 'high':
                recommendations.push('Schedule immediate follow-up session', 'Review and update safety plan', 'Increase session frequency');
                break;
            case 'medium':
                recommendations.push('Monitor situation closely', 'Review coping strategies', 'Schedule follow-up within 48 hours');
                break;
            case 'low':
                recommendations.push('Continue regular monitoring', 'Maintain current support level', 'Review prevention strategies');
                break;
        }
        // Add factor-specific recommendations
        factors.forEach(factor => {
            if (factor.severity > 0.7) {
                recommendations.push(`Address ${factor.type} concerns: ${factor.description}`);
            }
        });
        return recommendations;
    }
    private static determineNextSteps(urgency: RiskAssessment['urgency'], factors: Array<RiskFactor>): Array<string> {
        const steps: Array<string> = [];
        // Add urgency-based steps
        switch (urgency) {
            case 'critical':
                steps.push('1. Contact emergency services if immediate danger', '2. Notify supervisor immediately', '3. Document all actions taken', '4. Implement crisis intervention protocol');
                break;
            case 'high':
                steps.push('1. Schedule immediate follow-up session', '2. Contact support network', '3. Review and update safety plan', '4. Document risk assessment findings');
                break;
            case 'medium':
                steps.push('1. Schedule follow-up within 48 hours', '2. Review coping strategies', '3. Update treatment plan', '4. Monitor progress closely');
                break;
            case 'low':
                steps.push('1. Maintain regular session schedule', '2. Continue monitoring', '3. Review prevention strategies', '4. Document assessment findings');
                break;
        }
        return steps;
    }
    private static getEscalationProtocol(urgency: 'high' | 'critical'): string {
        return urgency === 'critical'
            ? 'IMMEDIATE ACTION REQUIRED:\n' +
                '1. Ensure immediate safety\n' +
                '2. Contact emergency services if needed\n' +
                '3. Notify clinical supervisor\n' +
                '4. Contact designated emergency contacts\n' +
                '5. Document all actions taken'
            : 'URGENT ACTION REQUIRED:\n' +
                '1. Assess immediate safety needs\n' +
                '2. Contact clinical supervisor\n' +
                '3. Schedule immediate follow-up\n' +
                '4. Review and update safety plan\n' +
                '5. Document assessment and actions';
    }
    private static async sendAlert(channel: AlertConfig['channels'][number], config: any, assessment: RiskAssessment): Promise<void> {
        const message = config.custom_message ||
            `Risk Alert: ${assessment.urgency.toUpperCase()} risk level detected. ` +
                `Overall risk: ${(assessment.overallRisk * 100).toFixed(1)}%. ` +
                `Immediate attention required.`;
        switch (channel) {
            case 'email':
                await this.sendEmailAlert(config.recipients, message, assessment);
                break;
            case 'sms':
                await this.sendSMSAlert(config.recipients, message);
                break;
            case 'in-app':
                await this.sendInAppAlert(config.recipients, message, assessment);
                break;
        }
    }
    private static async sendEmailAlert(recipients: Array<string>, message: string, assessment: RiskAssessment): Promise<void> {
    }
    private static async sendSMSAlert(recipients: Array<string>, message: string): Promise<void> {
    }
    private static async sendInAppAlert(recipients: Array<string>, message: string, assessment: RiskAssessment): Promise<void> {
        const { error } = await dataService
            .sendInAppAlert({
            recipients,
            message,
            risk_level: assessment.urgency,
            timestamp: new Date().toISOString(),
            assessment_data: assessment
        });
        if (error) {
            throw new Error(`Failed to send in-app alert: ${error.message}`);
        }
    }
    private static async logAlert(clientId: string, assessment: RiskAssessment, config: any): Promise<void> {
        const { error } = await dataService
            .logAlert({
            client_id: clientId,
            risk_level: assessment.urgency,
            risk_score: assessment.overallRisk,
            factors: assessment.factors,
            recommendations: assessment.recommendations,
            next_steps: assessment.nextSteps,
            escalation_protocol: assessment.escalationProtocol,
            alert_config: config,
            timestamp: new Date().toISOString()
        });
        if (error) {
            throw new Error(`Failed to log alert: ${error.message}`);
        }
    }
}
export default CrisisPrediction;
