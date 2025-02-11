import { Resend } from 'resend';
import { join } from 'path';
import { previewTemplate, listTemplates } from '../src/utils/template';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TestCase {
  template: string;
  subject: string;
  data: Record<string, any>;
}

const TEST_CASES: TestCase[] = [
  {
    template: 'welcome',
    subject: 'Welcome to TherapyTrain!',
    data: {
      name: 'Test User',
      dashboardUrl: 'https://app.therapytrain.ai/dashboard',
      supportUrl: 'https://help.therapytrain.ai',
      contactUrl: 'https://therapytrain.ai/contact',
      faqUrl: 'https://help.therapytrain.ai/faq',
      socialLinks: [
        { platform: 'Twitter', url: 'https://twitter.com/therapytrain' },
        { platform: 'LinkedIn', url: 'https://linkedin.com/company/therapytrain' }
      ]
    }
  },
  {
    template: 'password-reset',
    subject: 'Reset Your Password',
    data: {
      name: 'Test User',
      resetUrl: 'https://app.therapytrain.ai/reset-password?token=test',
      expiresIn: '30 minutes',
      supportUrl: 'https://help.therapytrain.ai'
    }
  }
];

async function testEmailTemplates() {
  try {
    console.log('Starting email template tests...\n');

    for (const testCase of TEST_CASES) {
      console.log(`Testing template: ${testCase.template}`);
      
      // Render the template
      const html = await previewTemplate(testCase.template, testCase.data);
      
      // Send test email
      const { data, error } = await resend.emails.send({
        from: 'TherapyTrain <test@therapytrain.ai>',
        to: ['test@resend.dev'],
        subject: testCase.subject,
        html: html,
        tags: [
          {
            name: 'template',
            value: testCase.template
          },
          {
            name: 'environment',
            value: 'test'
          }
        ]
      });

      if (error) {
        console.error(`Failed to send ${testCase.template} email:`, error);
      } else {
        console.log(`Successfully sent ${testCase.template} email:`, data);
      }
      
      console.log('---\n');
    }

    console.log('Email template tests completed!');
  } catch (error) {
    console.error('Failed to test email templates:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Error: RESEND_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  testEmailTemplates();
}

export { testEmailTemplates }; 