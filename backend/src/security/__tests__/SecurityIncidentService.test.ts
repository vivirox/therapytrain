import { SecurityIncidentService, IncidentType, IncidentSeverity } from '../SecurityIncidentService';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import { WebAuthnService } from '../WebAuthnService';

jest.mock('../../services/SecurityAuditService');
jest.mock('../WebAuthnService');

describe('SecurityIncidentService', () => {
    let securityIncidentService: SecurityIncidentService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockWebAuthnService: jest.Mocked<WebAuthnService>;

    const mockIp = '192.168.1.1';
    const mockUserId = 'test-user-id';

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;

        mockWebAuthnService = {} as any;

        securityIncidentService = new SecurityIncidentService(
            mockSecurityAuditService,
            mockWebAuthnService
        );

        jest.clearAllMocks();
    });

    describe('Rate Limiting', () => {
        it('should track rate limit violations', async () => {
            // Simulate multiple requests
            for (let i = 0; i < 9; i++) {
                await securityIncidentService.handleRateLimit(mockIp);
            }

            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();

            // Trigger threshold
            await securityIncidentService.handleRateLimit(mockIp);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'IP_BLOCKED',
                'HIGH',
                expect.objectContaining({
                    ip: mockIp,
                    reason: 'Rate limit exceeded'
                })
            );

            expect(securityIncidentService.isIpBlocked(mockIp)).toBe(true);
        });
    });

    describe('Brute Force Detection', () => {
        it('should detect and handle brute force attempts', async () => {
            // Simulate multiple failed attempts
            for (let i = 0; i < 4; i++) {
                await securityIncidentService.handleBruteForceAttempt(mockIp, mockUserId);
            }

            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();

            // Trigger threshold
            await securityIncidentService.handleBruteForceAttempt(mockIp, mockUserId);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'BRUTE_FORCE_DETECTED',
                'HIGH',
                expect.objectContaining({
                    ip: mockIp,
                    userId: mockUserId
                })
            );

            expect(securityIncidentService.isIpBlocked(mockIp)).toBe(true);
        });
    });

    describe('Suspicious Activity', () => {
        it('should track and handle suspicious activity', async () => {
            const details = { action: 'suspicious_action' };

            // Simulate multiple suspicious actions
            for (let i = 0; i < 2; i++) {
                await securityIncidentService.handleSuspiciousActivity(
                    mockIp,
                    mockUserId,
                    details
                );
            }

            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();

            // Trigger threshold
            await securityIncidentService.handleSuspiciousActivity(
                mockIp,
                mockUserId,
                details
            );

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'SUSPICIOUS_ACTIVITY_DETECTED',
                'HIGH',
                expect.objectContaining({
                    ip: mockIp,
                    userId: mockUserId,
                    action: 'suspicious_action'
                })
            );
        });
    });

    describe('Incident Handling', () => {
        it('should handle WebAuthn violations', async () => {
            await securityIncidentService.handleIncident({
                type: IncidentType.WEBAUTHN_VIOLATION,
                severity: IncidentSeverity.HIGH,
                timestamp: new Date(),
                sourceIp: mockIp,
                userId: mockUserId,
                details: { reason: 'invalid_signature' }
            });

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'WEBAUTHN_VIOLATION_RESPONSE',
                'HIGH',
                expect.objectContaining({
                    userId: mockUserId,
                    action: 'Requiring additional verification'
                })
            );
        });

        it('should handle CSP violations', async () => {
            const details = {
                'blocked-uri': 'http://malicious.com',
                'violated-directive': 'script-src'
            };

            await securityIncidentService.handleIncident({
                type: IncidentType.CSP_VIOLATION,
                severity: IncidentSeverity.MEDIUM,
                timestamp: new Date(),
                sourceIp: mockIp,
                details
            });

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'CSP_VIOLATION_RESPONSE',
                'MEDIUM',
                expect.objectContaining({
                    sourceIp: mockIp,
                    details
                })
            );
        });

        it('should handle data leak attempts', async () => {
            await securityIncidentService.handleIncident({
                type: IncidentType.DATA_LEAK_ATTEMPT,
                severity: IncidentSeverity.HIGH,
                timestamp: new Date(),
                sourceIp: mockIp,
                userId: mockUserId,
                details: { dataType: 'sensitive_info' }
            });

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'DATA_LEAK_PREVENTED',
                'HIGH',
                expect.objectContaining({
                    sourceIp: mockIp,
                    userId: mockUserId,
                    details: expect.objectContaining({
                        dataType: 'sensitive_info'
                    })
                })
            );

            expect(securityIncidentService.isIpBlocked(mockIp)).toBe(true);
        });

        it('should handle critical incidents', async () => {
            await securityIncidentService.handleIncident({
                type: IncidentType.UNAUTHORIZED_ACCESS,
                severity: IncidentSeverity.CRITICAL,
                timestamp: new Date(),
                sourceIp: mockIp,
                userId: mockUserId,
                details: { resource: 'admin_panel' }
            });

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'CRITICAL_INCIDENT_RESPONSE',
                'CRITICAL',
                expect.objectContaining({
                    incident: expect.objectContaining({
                        type: IncidentType.UNAUTHORIZED_ACCESS,
                        severity: IncidentSeverity.CRITICAL
                    }),
                    action: 'Blocking IP and notifying security team'
                })
            );

            expect(securityIncidentService.isIpBlocked(mockIp)).toBe(true);
        });
    });

    describe('Counter Cleanup', () => {
        it('should cleanup counters periodically', () => {
            jest.useFakeTimers();

            // Add some data to counters
            securityIncidentService.handleRateLimit(mockIp);
            securityIncidentService.handleBruteForceAttempt(mockIp);
            securityIncidentService.handleSuspiciousActivity(
                mockIp,
                mockUserId,
                { action: 'test' }
            );

            // Fast-forward 1 hour
            jest.advanceTimersByTime(3600000);

            // Try to trigger alerts (shouldn't work because counters are cleared)
            securityIncidentService.handleRateLimit(mockIp);
            securityIncidentService.handleBruteForceAttempt(mockIp);
            securityIncidentService.handleSuspiciousActivity(
                mockIp,
                mockUserId,
                { action: 'test' }
            );

            expect(mockSecurityAuditService.recordAlert).not.toHaveBeenCalled();

            jest.useRealTimers();
        });
    });
}); 