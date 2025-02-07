import { SecurityHeadersService } from '../SecurityHeadersService';
import { SecurityAuditService } from '../../services/SecurityAuditService';
import { Request, Response } from 'express';

jest.mock('../../services/SecurityAuditService');

describe('SecurityHeadersService', () => {
    let securityHeadersService: SecurityHeadersService;
    let mockSecurityAuditService: jest.Mocked<SecurityAuditService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        mockSecurityAuditService = {
            recordAlert: jest.fn()
        } as any;

        mockRequest = {
            sessionID: 'test-session',
            url: '/test',
            ip: '127.0.0.1',
            headers: {
                'user-agent': 'test-agent'
            }
        };

        mockResponse = {
            setHeader: jest.fn(),
            getHeader: jest.fn(),
            on: jest.fn()
        };

        nextFunction = jest.fn();

        securityHeadersService = new SecurityHeadersService(mockSecurityAuditService);
    });

    describe('Middleware', () => {
        it('should set all security headers by default', async () => {
            const middleware = securityHeadersService.middleware();
            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Verify HSTS header
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.stringContaining('max-age=31536000')
            );

            // Verify CSP header
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Security-Policy',
                expect.stringContaining("default-src 'self'")
            );

            // Verify other security headers
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-Content-Type-Options',
                'nosniff'
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-Frame-Options',
                'DENY'
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-XSS-Protection',
                '1; mode=block'
            );
        });

        it('should include nonce in CSP for script and style sources', async () => {
            const middleware = securityHeadersService.middleware();
            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            const cspCalls = (mockResponse.setHeader as jest.Mock).mock.calls
                .filter(call: unknown => call[0] === 'Content-Security-Policy');

            expect(cspCalls.length).toBe(1);
            expect(cspCalls[0][1]).toMatch(/'nonce-[A-Za-z0-9+/]+=?'/);
        });

        it('should handle custom CSP directives', async () => {
            const customConfig = {
                cspDirectives: {
                    scriptSrc: ["'self'", 'https://trusted.com'],
                    connectSrc: ["'self'", 'wss://api.trusted.com']
                }
            };

            const customService = new SecurityHeadersService(
                mockSecurityAuditService,
                customConfig
            );

            const middleware = customService.middleware();
            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            const cspCalls = (mockResponse.setHeader as jest.Mock).mock.calls
                .filter(call: unknown => call[0] === 'Content-Security-Policy');

            expect(cspCalls[0][1]).toContain('https://trusted.com');
            expect(cspCalls[0][1]).toContain('wss://api.trusted.com');
        });

        it('should log violations when headers are missing', async () => {
            (mockResponse.getHeader as jest.Mock).mockReturnValue(null);
            const middleware = securityHeadersService.middleware();

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Trigger the 'finish' event handler
            const finishHandler = (mockResponse.on as jest.Mock).mock.calls
                .find(call: unknown => call[0] === 'finish')[1];
            finishHandler();

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'SECURITY_HEADER_VIOLATION',
                'HIGH',
                expect.objectContaining({
                    headerName: 'CSP',
                    violation: 'Header missing'
                })
            );
        });

        it('should handle errors gracefully', async () => {
            (mockResponse.setHeader as jest.Mock).mockImplementation(() => {
                throw new Error('Header error');
            });

            const middleware = securityHeadersService.middleware();
            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'SECURITY_HEADERS_ERROR',
                'HIGH',
                expect.objectContaining({
                    error: 'Header error'
                })
            );
            expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('Nonce Management', () => {
        it('should generate and validate nonces correctly', () => {
            const sessionId = 'test-session';
            const nonce = (securityHeadersService as any).generateNonce();

            securityHeadersService.addNonce(sessionId, nonce);
            expect(securityHeadersService.validateNonce(sessionId, nonce)).toBe(true);
            expect(securityHeadersService.validateNonce(sessionId, 'invalid-nonce')).toBe(false);
        });

        it('should cleanup old nonces', () => {
            const sessionId = 'test-session';
            const nonces = Array(15).fill(null).map(() =>
                (securityHeadersService as any).generateNonce()
            );

            nonces.forEach(nonce: unknown => securityHeadersService.addNonce(sessionId, nonce));

            // Only the last 10 nonces should be valid
            nonces.slice(0, 5).forEach(nonce: unknown => {
                expect(securityHeadersService.validateNonce(sessionId, nonce)).toBe(false);
            });

            nonces.slice(5).forEach(nonce: unknown => {
                expect(securityHeadersService.validateNonce(sessionId, nonce)).toBe(true);
            });
        });
    });

    describe('Violation Reporting', () => {
        it('should handle CSP violation reports', async () => {
            const mockViolationReport = {
                'csp-report': {
                    'document-uri': 'http://example.com',
                    'violated-directive': 'script-src',
                    'blocked-uri': 'http://evil.com'
                }
            };

            const mockReportRequest = {
                ...mockRequest,
                body: mockViolationReport
            };

            await securityHeadersService.reportViolation(mockReportRequest as Request);

            expect(mockSecurityAuditService.recordAlert).toHaveBeenCalledWith(
                'CSP_VIOLATION',
                'HIGH',
                expect.objectContaining({
                    ...mockViolationReport
                })
            );
        });
    });
}); 