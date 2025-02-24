import { singleton } from 'tsyringe';
import { dataService } from '@/lib/data';
import { env } from '@/env.mjs';
import { createHash, randomBytes } from 'crypto';

@singleton()
export class SecurityService {
  private static instance: SecurityService;
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = Buffer.from(env.ENCRYPTION_KEY || randomBytes(32).toString('hex'), 'hex');
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  public async checkEncryption(session: any): Promise<{
    isEncrypted: boolean;
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if session data is encrypted
    const isSessionEncrypted = await this.verifyEncryption(session);
    if (!isSessionEncrypted) {
      issues.push('Session data is not encrypted');
      recommendations.push('Enable encryption for session data');
    }

    // Check if messages are encrypted
    const messages = session.messages || [];
    const unencryptedMessages = messages.filter(m => !this.verifyEncryption(m));
    if (unencryptedMessages.length > 0) {
      issues.push('Some messages are not encrypted');
      recommendations.push('Enable encryption for all messages');
    }

    // Check if attachments are encrypted
    const attachments = session.attachments || [];
    const unencryptedAttachments = attachments.filter(a => !this.verifyEncryption(a));
    if (unencryptedAttachments.length > 0) {
      issues.push('Some attachments are not encrypted');
      recommendations.push('Enable encryption for all attachments');
    }

    return {
      isEncrypted: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  public async checkAccessControls(session: any): Promise<{
    isSecure: boolean;
    issues?: string[];
    recommendations?: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check session access permissions
    const sessionPermissions = await this.getSessionPermissions(session);
    if (!this.validatePermissions(sessionPermissions)) {
      issues.push('Invalid session access permissions');
      recommendations.push('Review and update session access permissions');
    }

    // Check user roles and permissions
    const userPermissions = await this.getUserPermissions(session);
    if (!this.validateUserPermissions(userPermissions)) {
      issues.push('Invalid user permissions');
      recommendations.push('Review and update user role permissions');
    }

    // Check data access controls
    const dataAccess = await this.checkDataAccess(session);
    if (!dataAccess.isValid) {
      issues.push(...dataAccess.issues);
      recommendations.push(...dataAccess.recommendations);
    }

    return {
      isSecure: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  public async checkCompliance(session: any): Promise<{
    isCompliant: boolean;
  }> {
    // Check encryption
    const encryptionStatus = await this.checkEncryption(session);
    if (!encryptionStatus.isEncrypted) {
      return { isCompliant: false };
    }

    // Check access controls
    const accessStatus = await this.checkAccessControls(session);
    if (!accessStatus.isSecure) {
      return { isCompliant: false };
    }

    // Check authentication
    const authStatus = await this.checkAuthentication(session);
    if (!authStatus.isValid) {
      return { isCompliant: false };
    }

    // Check data protection
    const protectionStatus = await this.checkDataProtection(session);
    if (!protectionStatus.isProtected) {
      return { isCompliant: false };
    }

    return { isCompliant: true };
  }

  private async verifyEncryption(data: any): Promise<boolean> {
    if (!data) return false;

    try {
      // Check if data has encryption metadata
      if (!data.encryptionMetadata) {
        return false;
      }

      // Verify encryption algorithm
      if (data.encryptionMetadata.algorithm !== 'AES-256-GCM') {
        return false;
      }

      // Verify encryption key ID
      if (!await this.verifyKeyId(data.encryptionMetadata.keyId)) {
        return false;
      }

      // Verify data integrity
      const hash = createHash('sha256')
        .update(JSON.stringify(data.content))
        .digest('hex');

      return hash === data.encryptionMetadata.hash;
    } catch (error) {
      console.error('Error verifying encryption:', error);
      return false;
    }
  }

  private async getSessionPermissions(session: any): Promise<any> {
    return await dataService.get('permissions', {
      where: {
        resourceType: 'session',
        resourceId: session.id
      }
    });
  }

  private validatePermissions(permissions: any): boolean {
    if (!permissions) return false;

    // Check if permissions are properly structured
    if (!permissions.roles || !permissions.actions) {
      return false;
    }

    // Check if required roles are defined
    const requiredRoles = ['therapist', 'client', 'supervisor'];
    if (!requiredRoles.every(role => permissions.roles.includes(role))) {
      return false;
    }

    // Check if required actions are defined
    const requiredActions = ['read', 'write', 'delete'];
    if (!requiredActions.every(action => permissions.actions.includes(action))) {
      return false;
    }

    return true;
  }

  private async getUserPermissions(session: any): Promise<any> {
    const users = await dataService.list('users', {
      where: {
        sessionId: session.id
      },
      include: ['roles', 'permissions']
    });

    return users.map(user => ({
      userId: user.id,
      roles: user.roles,
      permissions: user.permissions
    }));
  }

  private validateUserPermissions(permissions: any[]): boolean {
    return permissions.every(userPerm => {
      // Check if user has required roles
      if (!userPerm.roles || userPerm.roles.length === 0) {
        return false;
      }

      // Check if user has required permissions
      if (!userPerm.permissions || Object.keys(userPerm.permissions).length === 0) {
        return false;
      }

      return true;
    });
  }

  private async checkDataAccess(session: any): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check data access patterns
    const accessPatterns = await this.getDataAccessPatterns(session);
    if (!this.validateAccessPatterns(accessPatterns)) {
      issues.push('Invalid data access patterns detected');
      recommendations.push('Review and update data access patterns');
    }

    // Check access control lists
    const acls = await this.getAccessControlLists(session);
    if (!this.validateAcls(acls)) {
      issues.push('Invalid access control lists');
      recommendations.push('Update access control lists');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private async checkAuthentication(session: any): Promise<{
    isValid: boolean;
  }> {
    try {
      // Check session authentication
      const sessionAuth = await this.verifySessionAuthentication(session);
      if (!sessionAuth) {
        return { isValid: false };
      }

      // Check user authentication
      const userAuth = await this.verifyUserAuthentication(session);
      if (!userAuth) {
        return { isValid: false };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error checking authentication:', error);
      return { isValid: false };
    }
  }

  private async checkDataProtection(session: any): Promise<{
    isProtected: boolean;
  }> {
    try {
      // Check data encryption
      const encryptionStatus = await this.verifyDataEncryption(session);
      if (!encryptionStatus) {
        return { isProtected: false };
      }

      // Check data integrity
      const integrityStatus = await this.verifyDataIntegrity(session);
      if (!integrityStatus) {
        return { isProtected: false };
      }

      // Check access controls
      const accessStatus = await this.verifyAccessControls(session);
      if (!accessStatus) {
        return { isProtected: false };
      }

      return { isProtected: true };
    } catch (error) {
      console.error('Error checking data protection:', error);
      return { isProtected: false };
    }
  }

  private async verifyKeyId(keyId: string): Promise<boolean> {
    try {
      const key = await dataService.get('encryption_keys', keyId);
      return !!key && !key.revoked;
    } catch (error) {
      console.error('Error verifying key ID:', error);
      return false;
    }
  }

  private async getDataAccessPatterns(session: any): Promise<any[]> {
    return await dataService.list('access_patterns', {
      where: {
        sessionId: session.id
      }
    });
  }

  private validateAccessPatterns(patterns: any[]): boolean {
    return patterns.every(pattern => {
      // Check if pattern has required fields
      if (!pattern.userId || !pattern.resourceType || !pattern.accessType) {
        return false;
      }

      // Check if access type is valid
      const validAccessTypes = ['read', 'write', 'delete'];
      if (!validAccessTypes.includes(pattern.accessType)) {
        return false;
      }

      return true;
    });
  }

  private async getAccessControlLists(session: any): Promise<any[]> {
    return await dataService.list('access_control_lists', {
      where: {
        sessionId: session.id
      }
    });
  }

  private validateAcls(acls: any[]): boolean {
    return acls.every(acl => {
      // Check if ACL has required fields
      if (!acl.userId || !acl.permissions) {
        return false;
      }

      // Check if permissions are valid
      const validPermissions = ['read', 'write', 'delete'];
      return acl.permissions.every((p: string) => validPermissions.includes(p));
    });
  }

  private async verifySessionAuthentication(session: any): Promise<boolean> {
    try {
      // Check session token
      if (!session.token) {
        return false;
      }

      // Verify token
      const tokenStatus = await this.verifyToken(session.token);
      if (!tokenStatus.isValid) {
        return false;
      }

      // Check session expiry
      if (new Date(session.expiresAt) < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying session authentication:', error);
      return false;
    }
  }

  private async verifyUserAuthentication(session: any): Promise<boolean> {
    try {
      const users = await dataService.list('users', {
        where: {
          sessionId: session.id
        }
      });

      return users.every(user => {
        // Check if user is active
        if (!user.isActive) {
          return false;
        }

        // Check if user is authenticated
        if (!user.isAuthenticated) {
          return false;
        }

        // Check if user has required permissions
        if (!this.validateUserPermissions([user])) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error verifying user authentication:', error);
      return false;
    }
  }

  private async verifyDataEncryption(session: any): Promise<boolean> {
    try {
      // Check session data encryption
      if (!await this.verifyEncryption(session)) {
        return false;
      }

      // Check messages encryption
      const messages = session.messages || [];
      if (!messages.every(m => this.verifyEncryption(m))) {
        return false;
      }

      // Check attachments encryption
      const attachments = session.attachments || [];
      if (!attachments.every(a => this.verifyEncryption(a))) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying data encryption:', error);
      return false;
    }
  }

  private async verifyDataIntegrity(session: any): Promise<boolean> {
    try {
      // Check session data integrity
      const sessionHash = createHash('sha256')
        .update(JSON.stringify(session.content))
        .digest('hex');

      if (sessionHash !== session.hash) {
        return false;
      }

      // Check messages integrity
      const messages = session.messages || [];
      if (!messages.every(m => {
        const hash = createHash('sha256')
          .update(JSON.stringify(m.content))
          .digest('hex');
        return hash === m.hash;
      })) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      return false;
    }
  }

  private async verifyAccessControls(session: any): Promise<boolean> {
    try {
      // Check session access controls
      const sessionAcls = await this.getAccessControlLists(session);
      if (!this.validateAcls(sessionAcls)) {
        return false;
      }

      // Check user permissions
      const userPermissions = await this.getUserPermissions(session);
      if (!this.validateUserPermissions(userPermissions)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying access controls:', error);
      return false;
    }
  }

  private async verifyToken(token: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Check if token exists
      const tokenRecord = await dataService.get('tokens', {
        where: {
          token,
          status: 'active'
        }
      });

      if (!tokenRecord) {
        return {
          isValid: false,
          error: 'Token not found or inactive'
        };
      }

      // Check if token is expired
      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return {
          isValid: false,
          error: 'Token expired'
        };
      }

      // Verify token signature
      const isSignatureValid = await this.verifyTokenSignature(token);
      if (!isSignatureValid) {
        return {
          isValid: false,
          error: 'Invalid token signature'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error verifying token:', error);
      return {
        isValid: false,
        error: 'Error verifying token'
      };
    }
  }

  private async verifyTokenSignature(token: string): Promise<boolean> {
    try {
      const [header, payload, signature] = token.split('.');
      
      // Recreate signature
      const data = `${header}.${payload}`;
      const expectedSignature = createHash('sha256')
        .update(data)
        .update(this.encryptionKey)
        .digest('base64url');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying token signature:', error);
      return false;
    }
  }
} 