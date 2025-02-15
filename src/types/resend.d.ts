declare module 'resend' {
  export interface SendEmailOptions {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
    tags?: Array<{ name: string; value: string }>;
  }

  export interface SendEmailResponse {
    data: {
      id: string;
    } | null;
    error: Error | null;
  }

  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(options: SendEmailOptions): Promise<SendEmailResponse>;
    };
  }
}

// Extend jest.Mocked to include Resend types
declare global {
  namespace jest {
    interface Mocked<T> {
      send?: jest.Mock<Promise<SendEmailResponse>, [SendEmailOptions]>;
    }
  }
} 