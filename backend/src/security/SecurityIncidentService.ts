import { SecurityAuditService } from '../services/SecurityAuditService';
import { WebAuthnService } from './WebAuthnService';

export enum IncidentSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum IncidentType {
    AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
    BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    WEBAUTHN_VIOLATION = 'WEBAUTHN_VIOLATION',
    CSP_VIOLATION = 'CSP_VIOLATION',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    DATA_LEAK_ATTEMPT = 'DATA_LEAK_ATTEMPT'
}

export interface SecurityIncident {
    type: IncidentType;
    severity: IncidentSeverity;
    timestamp: Date;
    sourceIp: string;
    userId?: string;
    details: Record<string, any>;
    resolved: boolean;
    resolutionNotes?: string;
}

export class SecurityIncidentService {
    private static readonly RATE_LIMIT_THRESHOLD = 10;
    private static readonly BRUTE_FORCE_THRESHOLD = 5;
    private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 3;

    private rateLimitCounters: Map<string, number> = new Map();
    private bruteForceCounters: Map<string, number> = new Map();
    private suspiciousActivityCounters: Map<string, number> = new Map();
    private blockedIps: Set<string> = new Set();

    constructor(
        private readonly securityAuditService: SecurityAuditService,
        private readonly webAuthnService: WebAuthnService
    ) {
        // Clean up counters every hour
        setInterval(() => this.cleanupCounters(), 3_600_000);
    }

    private cleanupCounters(): void {
        this.rateLimitCounters.clear();
        this.bruteForceCounters.clear();
        this.suspiciousActivityCounters.clear();
    }

    private async incrementCounter(
        map: Map<string, number>,
        key: string,
        threshold: number,
        incidentType: IncidentType
    ): Promise<boolean> {
        const count = (map.get(key) || 0) + 1;
        map.set(key, count);

        if (count >= threshold) {
            await this.handleIncident({
                type: incidentType,
                severity: IncidentSeverity.HIGH,
                timestamp: new Date(),
                sourceIp: key,
                details: { count, threshold }
            });
            return true;
        }
        return false;
    }

    public async handleRateLimit(ip: string): Promise<void> {
        const exceeded = await this.incrementCounter(
            this.rateLimitCounters,
            ip,
            SecurityIncidentService.RATE_LIMIT_THRESHOLD,
            IncidentType.RATE_LIMIT_EXCEEDED
        );

        if (exceeded) {
            this.blockedIps.add(ip);
            await this.securityAuditService.recordAlert(
                'IP_BLOCKED',
                'HIGH',
                { ip, reason: 'Rate limit exceeded' }
            );
        }
    }

    public async handleBruteForceAttempt(ip: string, userId?: string): Promise<void> {
        const exceeded = await this.incrementCounter(
            this.bruteForceCounters,
            ip,
            SecurityIncidentService.BRUTE_FORCE_THRESHOLD,
            IncidentType.BRUTE_FORCE_ATTEMPT
        );

        if (exceeded) {
            this.blockedIps.add(ip);
            await this.securityAuditService.recordAlert(
                'BRUTE_FORCE_DETECTED',
                'HIGH',
                { ip, userId }
            );
        }
    }

    public async handleSuspiciousActivity(
        ip: string,
        userId: string,
        details: Record<string, any>
    ): Promise<void> {
        const exceeded = await this.incrementCounter(
            this.suspiciousActivityCounters,
            ip,
            SecurityIncidentService.SUSPICIOUS_ACTIVITY_THRESHOLD,
            IncidentType.SUSPICIOUS_ACTIVITY
        );

        if (exceeded) {
            await this.securityAuditService.recordAlert(
                'SUSPICIOUS_ACTIVITY_DETECTED',
                'HIGH',
                { ip, userId, ...details }
            );
        }
    }

    public isIpBlocked(ip: string): boolean {
        return this.blockedIps.has(ip);
    }

    public async handleIncident(incident: Omit<SecurityIncident, 'resolved'>): Promise<void> {
        const fullIncident: SecurityIncident = {
            ...incident,
            resolved: false
        };

        // Log the incident
        await this.securityAuditService.recordAlert(
            incident.type,
            incident.severity,
            {
                timestamp: incident.timestamp,
                sourceIp: incident.sourceIp,
                userId: incident.userId,
                ...incident.details
            }
        );

        // Implement automatic responses based on incident type and severity
        switch (incident.type) {
            case IncidentType.AUTHENTICATION_FAILURE:
                await this.handleBruteForceAttempt(incident.sourceIp, incident.userId);
                break;

            case IncidentType.WEBAUTHN_VIOLATION:
                await this.handleWebAuthnViolation(incident);
                break;

            case IncidentType.CSP_VIOLATION:
                await this.handleCspViolation(incident);
                break;

            case IncidentType.DATA_LEAK_ATTEMPT:
                await this.handleDataLeakAttempt(incident);
                break;
        }

        // For critical incidents, implement additional measures
        if (incident.severity === IncidentSeverity.CRITICAL) {
            await this.handleCriticalIncident(fullIncident);
        }
    }

    private async handleWebAuthnViolation(incident: Omit<SecurityIncident, 'resolved'>): Promise<void> {
        // Implement specific WebAuthn violation handling
        if (incident.userId) {
            await this.securityAuditService.recordAlert(
                'WEBAUTHN_VIOLATION_RESPONSE',
                'HIGH',
                {
                    userId: incident.userId,
                    action: 'Requiring additional verification'
                }
            );
        }
    }

    private async handleCspViolation(incident: Omit<SecurityIncident, 'resolved'>): Promise<void> {
        // Implement CSP violation handling
        await this.securityAuditService.recordAlert(
            'CSP_VIOLATION_RESPONSE',
            'MEDIUM',
            {
                sourceIp: incident.sourceIp,
                details: incident.details
            }
        );
    }

    private async handleDataLeakAttempt(incident: Omit<SecurityIncident, 'resolved'>): Promise<void> {
        // Implement data leak attempt handling
        this.blockedIps.add(incident.sourceIp);
        await this.securityAuditService.recordAlert(
            'DATA_LEAK_PREVENTED',
            'HIGH',
            {
                sourceIp: incident.sourceIp,
                userId: incident.userId,
                details: incident.details
            }
        );
    }

    private async handleCriticalIncident(incident: SecurityIncident): Promise<void> {
        // Implement critical incident handling
        this.blockedIps.add(incident.sourceIp);

        await this.securityAuditService.recordAlert(
            'CRITICAL_INCIDENT_RESPONSE',
            'CRITICAL',
            {
                incident,
                action: 'Blocking IP and notifying security team'
            }
        );

        // Here you would typically:
        // 1. Send immediate notifications to security team
        // 2. Trigger automatic system lockdown procedures
        // 3. Initiate incident response protocols
        // 4. Generate detailed forensics report
    }
} 