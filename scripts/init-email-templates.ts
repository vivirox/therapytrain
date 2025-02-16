import { readFile } from 'fs/promises';
import { join } from 'path';
import { TemplateManager } from '../src/lib/email/template-manager';
import mjml2html from 'mjml';

const TEMPLATE_DIR = join(process.cwd(), 'src/templates/email');

interface TemplateConfig {
  name: string;
  description: string;
  category: 'transactional' | 'marketing' | 'notification';
  subject: string;
  variables: string[];
}

const templates: TemplateConfig[] = [
  {
    name: 'welcome',
    description: 'Welcome email sent to new users',
    category: 'transactional',
    subject: 'Welcome to TherapyTrain!',
    variables: [
      'name',
      'dashboardUrl',
      'supportUrl',
      'contactUrl',
      'faqUrl',
      'socialLinks',
      'logoUrl',
      'privacyUrl',
      'termsUrl',
      'unsubscribeUrl',
      'recipientEmail',
    ],
  },
  {
    name: 'password-reset',
    description: 'Password reset request email',
    category: 'transactional',
    subject: 'Reset Your Password',
    variables: [
      'name',
      'resetUrl',
      'expiresIn',
      'supportUrl',
      'logoUrl',
      'privacyUrl',
      'termsUrl',
      'unsubscribeUrl',
      'recipientEmail',
    ],
  },
  {
    name: 'password-updated',
    description: 'Password updated confirmation email',
    category: 'transactional',
    subject: 'Password Updated Successfully',
    variables: [
      'timestamp',
      'logoUrl',
      'privacyUrl',
      'termsUrl',
      'unsubscribeUrl',
      'recipientEmail',
    ],
  },
  {
    name: 'password-reset-success',
    description: 'Password reset success confirmation email',
    category: 'transactional',
    subject: 'Password Reset Successful',
    variables: [
      'timestamp',
      'logoUrl',
      'privacyUrl',
      'termsUrl',
      'unsubscribeUrl',
      'recipientEmail',
    ],
  },
];

async function initializeTemplates() {
  try {
    const templateManager = TemplateManager.getInstance();

    for (const config of templates) {
      console.log(`Processing template: ${config.name}`);

      // Read MJML template
      const mjmlContent = await readFile(
        join(TEMPLATE_DIR, `${config.name}.mjml`),
        'utf-8'
      );

      // Convert MJML to HTML
      const { html, errors } = mjml2html(mjmlContent);
      if (errors.length > 0) {
        console.error(`MJML conversion errors for ${config.name}:`, errors);
        continue;
      }

      // Create template in database
      await templateManager.createTemplate({
        name: config.name,
        description: config.description,
        html,
        subject: config.subject,
        variables: config.variables,
        category: config.category,
      });

      console.log(`Template ${config.name} created successfully`);
    }

    console.log('All templates initialized successfully');
  } catch (error) {
    console.error('Error initializing templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeTemplates();
}

export { initializeTemplates }; 