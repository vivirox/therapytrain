import { AIService } from "../../src/services/AIService";
import { SecurityAuditService } from "../../src/services/SecurityAuditService";
import { RateLimiterService } from "../../src/services/RateLimiterService";
import { performance } from 'perf_hooks';
describe('AIService Integration Tests', () => {
    let aiService: AIService;
    let securityAudit: SecurityAuditService;
    let rateLimiter: RateLimiterService;
    const userId = 'test-user-123';
    beforeEach(() => {
        securityAudit = new SecurityAuditService();
        rateLimiter = new RateLimiterService();
        aiService = new AIService(securityAudit, rateLimiter);
        // Clear any existing rate limits
        jest.spyOn(rateLimiter, 'isRateLimited').mockReturnValue(false);
        // Mock security audit
        jest.spyOn(securityAudit, 'recordEvent').mockResolvedValue(undefined);
    });
    describe('Message Processing', () => {
        it('should process a normal message successfully', async () => {
            const message = "I'm feeling a bit anxious about my upcoming presentation.";
            const response = await aiService.processMessage(userId, message);
            expect(response).toBeDefined();
            expect(response.content).toBeTruthy();
            expect(response.metadata).toBeDefined();
            expect(response.metadata?.sentiment).toBeDefined();
            expect(response.metadata?.topics).toBeDefined();
            expect(response.metadata?.followUpQuestions).toHaveLength(3);
            // Verify security audit was called
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('ai_request', expect.objectContaining({
                userId,
                messageLength: message.length
            }));
        });
        it('should handle rate limiting correctly', async () => {
            // Mock rate limit exceeded
            jest.spyOn(rateLimiter, 'isRateLimited').mockReturnValue(true);
            await expect(aiService.processMessage(userId, "Test message")).rejects.toThrow('Rate limit exceeded for AI requests');
            // Verify security audit logged the error
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('ai_error', expect.objectContaining({
                userId,
                error: 'Rate limit exceeded for AI requests'
            }));
        });
        it('should retry failed AI model calls', async () => {
            const message = "Test retry message";
            let attempts = 0;
            // Mock AI model to fail twice then succeed
            jest.spyOn(aiService as any, 'callAIModel').mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('AI model temporary error');
                }
                return Promise.resolve({ content: 'Success after retry' });
            });
            const response = await aiService.processMessage(userId, message);
            expect(response.content).toBe('Success after retry');
            expect(attempts).toBe(3);
        });
    });
    describe('Crisis Detection', () => {
        it('should detect and handle crisis messages appropriately', async () => {
            const crisisMessage = "I'm having thoughts of harming myself";
            const response = await aiService.processMessage(userId, crisisMessage);
            // Verify crisis response
            expect(response.content).toContain('National Crisis Hotline');
            expect(response.content).toContain('988');
            expect(response.metadata?.sentiment).toBeLessThan(0);
            expect(response.metadata?.topics).toContain('crisis');
            // Verify crisis was logged
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('crisis_detected', expect.objectContaining({
                messageContent: crisisMessage
            }));
        });
        it('should provide appropriate follow-up questions for crisis situations', async () => {
            const crisisMessage = "I want to end it all";
            const response = await aiService.processMessage(userId, crisisMessage);
            expect(response.metadata?.followUpQuestions).toContain('Are you in a safe place right now?');
            expect(response.metadata?.followUpQuestions).toContain('Would you like help contacting emergency services?');
        });
    });
    describe('Response Analysis', () => {
        it('should analyze sentiment correctly', async () => {
            const testCases = [
                { message: "I'm feeling great today!", expectedSentiment: 0.8 },
                { message: "I'm really struggling with depression", expectedSentiment: -0.7 },
                { message: "Just had a normal day", expectedSentiment: 0 }
            ];
            for (const testCase of testCases) {
                const response = await aiService.processMessage(userId, testCase.message);
                expect(response.metadata?.sentiment).toBeCloseTo(testCase.expectedSentiment, 1);
            }
        });
        it('should extract relevant topics', async () => {
            const message = "I'm having trouble with anxiety and sleep, especially before work presentations";
            const response = await aiService.processMessage(userId, message);
            expect(response.metadata?.topics).toContain('anxiety');
            expect(response.metadata?.topics).toContain('sleep');
            expect(response.metadata?.topics).toContain('work stress');
        });
        it('should generate contextually appropriate follow-up questions', async () => {
            const message = "My relationship with my partner has been tense lately";
            const response = await aiService.processMessage(userId, message);
            const followUps = response.metadata?.followUpQuestions || [];
            expect(followUps.length).toBeGreaterThan(0);
            expect(followUps.some(q => q.toLowerCase().includes('relationship'))).toBe(true);
            expect(followUps.some(q => q.toLowerCase().includes('partner'))).toBe(true);
        });
    });
    describe('Performance and Resource Usage', () => {
        it('should process messages within acceptable time limits', async () => {
            const message = "Test performance message";
            const start = performance.now();
            await aiService.processMessage(userId, message);
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(1000); // Should process within 1 second
        });
        it('should handle concurrent message processing efficiently', async () => {
            const messages = Array(5).fill("Test concurrent processing");
            const start = performance.now();
            await Promise.all(messages.map(msg => aiService.processMessage(userId, msg)));
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(3000); // Should handle 5 concurrent messages within 3 seconds
        });
    });
});
