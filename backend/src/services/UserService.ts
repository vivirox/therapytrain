export class UserService {
  // Add methods that will be mocked in tests
  async getUserById(id: string) {
    throw new Error('Not implemented');
  }

  async updateUserStatus(id: string, status: string) {
    throw new Error('Not implemented');
  }

  async getUserByEmail(email: string) {
    throw new Error('Not implemented');
  }

  async temporaryLockAccount(userId: string, duration?: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async revokeResourceAccess(userId: string, resourceId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async revokeCurrentSession(userId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
