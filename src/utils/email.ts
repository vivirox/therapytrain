import { Resend } from 'resend';
import type { SendEmailOptions } from 'resend/build/src/interfaces';
import { render } from '@/utils/template';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

interface EmailError extends Error {
  code: string;
  statusCode?: number;
}

const resend = new Resend(process.env.RESEND_API_KEY || '');

// Email error codes
export const EMAIL_ERROR_CODES = {
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  RENDER_ERROR: 'RENDER_ERROR',
  SEND_ERROR: 'SEND_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

// Validate email configuration
function validateConfig() {
  if (!process.env.RESEND_API_KEY) {
    throw createEmailError(
      'Resend API key is not configured',
      EMAIL_ERROR_CODES.CONFIGURATION_ERROR
    );
  }
}

// Create standardized email error
function createEmailError(message: string, code: string, statusCode?: number): EmailError {
  const error = new Error(message) as EmailError;
  error.code = code;
  if (statusCode) error.statusCode = statusCode;
  return error;
}

// Validate email addresses
function validateEmails(emails: string | string[]): string[] {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const invalidEmails = emailArray.filter(email => !emailRegex.test(email));
  if (invalidEmails.length > 0) {
    throw createEmailError(
      `Invalid email addresses: ${invalidEmails.join(', ')}`,
      EMAIL_ERROR_CODES.INVALID_RECIPIENT
    );
  }
  
  return emailArray;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, from, subject, text, html, replyTo, cc, bcc, attachments } = options;

  try {
    const emailOptions: SendEmailOptions = {
      from,
      to,
      subject,
      text,
      html,
      replyTo,
      cc,
      bcc,
      attachments,
    };

    await resend.emails.send(emailOptions);
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).statusCode === 429) {
        // Handle rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendEmail(options);
      } else {
        throw new Error(`Failed to send email: ${(error as any).statusCode} - ${error.message}`);
      }
    } else {
      throw new Error('Failed to send email: Unknown error');
    }
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset Your Password',
    template: 'password-reset',
    context: {
      resetUrl,
      expiresIn: '30 minutes'
    },
    tags: [{ name: 'type', value: 'password-reset' }]
  });
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to Gradiant!',
    template: 'welcome',
    context: {
      name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      supportUrl: process.env.SUPPORT_URL,
      contactUrl: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
      faqUrl: `${process.env.SUPPORT_URL}/faq`,
      socialLinks: [
        { platform: 'Twitter', url: process.env.SOCIAL_TWITTER },
        { platform: 'LinkedIn', url: process.env.SOCIAL_LINKEDIN }
      ]
    },
    tags: [{ name: 'type', value: 'welcome' }]
  });
}

export async function sendPasswordUpdatedEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Password Updated Successfully',
    template: 'password-updated',
    context: {
      timestamp: new Date().toISOString(),
    },
  });
}

export async function sendPasswordResetSuccessEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Password Reset Successful',
    template: 'password-reset-success',
    context: {
      timestamp: new Date().toISOString(),
    },
  });
} 