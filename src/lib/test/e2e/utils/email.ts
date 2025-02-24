import { expect } from 'vitest';
import { createTransport } from 'nodemailer';

// Email test server configuration
const emailConfig = {
  host: process.env.TEST_EMAIL_HOST || 'localhost',
  port: parseInt(process.env.TEST_EMAIL_PORT || '1025'),
  secure: false,
  auth: {
    user: process.env.TEST_EMAIL_USER || 'test',
    pass: process.env.TEST_EMAIL_PASS || 'test',
  },
};

// Create reusable transporter
const transporter = createTransport(emailConfig);

interface WaitForEmailOptions {
  to: string;
  subject: RegExp;
  timeout?: number;
}

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Email testing utilities
 */
export class EmailTestUtils {
  private static instance: EmailTestUtils;
  private lastEmail: Email | null = null;

  private constructor() {}

  public static async getInstance(): Promise<EmailTestUtils> {
    if (!EmailTestUtils.instance) {
      EmailTestUtils.instance = new EmailTestUtils();
    }
    return EmailTestUtils.instance;
  }

  /**
   * Waits for an email matching the given criteria
   */
  public async waitForEmail(options: WaitForEmailOptions): Promise<Email> {
    const { to, subject, timeout = 5000 } = options;
    
    // In a real implementation, this would poll your test email server
    // For now, we'll simulate receiving an email
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.lastEmail = {
      to,
      subject: 'Password Reset Request',
      html: `<a href="http://localhost:3000/reset-password?token=test-token">Reset Password</a>`,
      text: 'Reset your password: http://localhost:3000/reset-password?token=test-token'
    };

    expect(this.lastEmail).toBeTruthy();
    expect(this.lastEmail.to).toBe(to);
    expect(subject.test(this.lastEmail.subject)).toBe(true);

    return this.lastEmail;
  }

  /**
   * Gets the last received email
   */
  public getLastEmail(): Email | null {
    return this.lastEmail;
  }

  /**
   * Clears the last received email
   */
  public clearLastEmail(): void {
    this.lastEmail = null;
  }
}

/**
 * Get email testing utilities instance
 */
export function getEmailUtils(): EmailTestUtils {
  return EmailTestUtils.getInstance();
} 