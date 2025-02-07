import { AES, enc } from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  metadata: Record<string, any>;
}

export interface EncryptedData {
  data: string;
  iv: string;
}

export class SecurityService {
  private static instance: SecurityService;
  private auditLogs: Array<AuditLog>;
  private encryptionKey: string;

  private constructor() {
    this.auditLogs = [];
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private generateEncryptionKey(): string {
    return uuidv4();
  }

  async encryptData(data: any): Promise<EncryptedData> {
    try {
      const iv = enc.Hex.parse(uuidv4().replace(/-/g, ''));
      const encrypted = AES.encrypt(JSON.stringify(data), this.encryptionKey, {
        iv,
      });

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decryptData(encryptedData: EncryptedData): Promise<any> {
    try {
      const decrypted = AES.decrypt(
        encryptedData.data,
        this.encryptionKey,
        {
          iv: enc.Hex.parse(encryptedData.iv),
        }
      );

      return JSON.parse(decrypted.toString(enc.Utf8));
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async logAudit(
    userId: string,
    action: string,
    resource: string,
    status: 'success' | 'failure',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      userId,
      action,
      resource,
      status,
      metadata,
    };

    this.auditLogs.push(auditLog);

    try {
      await fetch('/api/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditLog),
      });
    } catch (error) {
      console.error('Audit logging error:', error);
      throw error;
    }
  }

  async anonymizeData(data: any): Promise<any> {
    const sensitiveFields = ['name', 'email', 'phone', 'address', 'ssn'];
    
    const anonymize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(item: unknown => anonymize(item));
      }

      const anonymized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          anonymized[key] = this.hashValue(value.toString());
        } else if (typeof value === 'object') {
          anonymized[key] = anonymize(value);
        } else {
          anonymized[key] = value;
        }
      }

      return anonymized;
    };

    return anonymize(data);
  }

  private hashValue(value: string): string {
    return `[REDACTED-${value.length}]`;
  }

  async validateAccess(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/security/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, resource, action }),
      });

      if (!response.ok) return false;
      const { hasAccess } = await response.json();
      return hasAccess;
    } catch (error) {
      console.error('Access validation error:', error);
      return false;
    }
  }

  getAuditLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Array<AuditLog> {
    let filteredLogs = [...this.auditLogs];

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      return filteredLogs.filter(log => log.timestamp <= endDate);
    }

    return filteredLogs;
  }
}
