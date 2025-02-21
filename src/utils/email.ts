import { Resend } from 'resend';
import { render } from '@/utils/template';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  tags?: Array<{ name: string; value: string }>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

interface EmailError extends Error {
  code: string;
  statusCode?: number;
}

const resend = new Resend(process.env.RESEND_API_KEY);

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

/**
 * Send an email using a template
 */
export async function sendEmail({
  to,
  subject,
  template,
  context,
  tags = [],
  replyTo,
  cc,
  bcc
}: EmailOptions): Promise<void> {
  try {
    validateConfig();
    
    // Validate email addresses
    const toEmails = validateEmails(to);
    const ccEmails = cc ? validateEmails(cc) : undefined;
    const bccEmails = bcc ? validateEmails(bcc) : undefined;
    
    // Add default tags
    const defaultTags = [
      { name: 'template', value: template },
      { name: 'environment', value: process.env.NODE_ENV || 'development' }
    ];
    
    // Render template
    const html = await render(template, context).catch(error => {
      throw createEmailError(
        `Failed to render template ${template}: ${error.message}`,
        EMAIL_ERROR_CODES.RENDER_ERROR
      );
    });
    
    // Send email
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@gemcity.xyz',
      to: toEmails,
      subject,
      html,
      reply_to: replyTo,
      cc: ccEmails,
      bcc: bccEmails,
      tags: [...defaultTags, ...tags]
    });

    if (error) {
      // Handle specific error cases
      if (error.statusCode === 429) {
        throw createEmailError(
          'Rate limit exceeded',
          EMAIL_ERROR_CODES.RATE_LIMIT,
          429
        );
      }
      
      throw createEmailError(
        `Failed to send email: ${error.message}`,
        EMAIL_ERROR_CODES.SEND_ERROR,
        error.statusCode
      );
    }
  } catch (error) {
    // Log error for monitoring
    console.error('Email error:', {
      error,
      template,
      to,
      subject,
      timestamp: new Date().toISOString()
    });
    
    // Rethrow error
    throw error;
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