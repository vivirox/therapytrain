import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';

const TEMPLATE_DIR = join(process.cwd(), 'src/templates/email');
const templateCache = new Map<string, HandlebarsTemplateDelegate>();
const partialsCache = new Map<string, HandlebarsTemplateDelegate>();

// Register common helpers
Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
});

Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: Handlebars.HelperOptions) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

// Default template context that's available to all templates
const defaultContext = {
  companyName: 'TherapyTrain',
  supportUrl: process.env.SUPPORT_URL || '#',
  lang: 'en',
  dir: 'ltr'
};

/**
 * Load and register a partial template
 */
async function loadPartial(partialName: string): Promise<void> {
  if (!partialsCache.has(partialName)) {
    const partialPath = join(TEMPLATE_DIR, `${partialName}.hbs`);
    try {
      const content = await readFile(partialPath, 'utf-8');
      const template = Handlebars.compile(content);
      partialsCache.set(partialName, template);
      Handlebars.registerPartial(partialName, content);
    } catch (error) {
      console.error(`Failed to load partial ${partialName}:`, error);
      throw new Error(`Failed to load partial ${partialName}`);
    }
  }
}

/**
 * Render a template with the given context
 */
export async function render(templateName: string, context: Record<string, any>): Promise<string> {
  try {
    // Load base template if not already loaded
    await loadPartial('base');
    
    // Check cache first
    let template = templateCache.get(templateName);
    
    if (!template) {
      // Load and compile template
      const templatePath = join(TEMPLATE_DIR, `${templateName}.hbs`);
      const templateContent = await readFile(templatePath, 'utf-8');
      template = Handlebars.compile(templateContent);
      templateCache.set(templateName, template);
    }
    
    // Merge context with defaults
    const mergedContext = {
      ...defaultContext,
      ...context,
      title: context.title || `${defaultContext.companyName} - ${templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
    };
    
    // Render template with context
    return template(mergedContext);
  } catch (error) {
    console.error(`Failed to render template ${templateName}:`, error);
    throw new Error(`Failed to render template ${templateName}`);
  }
}

/**
 * Preview a template with test data
 */
export async function previewTemplate(templateName: string, testData: Record<string, any> = {}): Promise<string> {
  const previewContext = {
    name: 'John Doe',
    email: 'john@example.com',
    resetUrl: 'https://example.com/reset',
    expiresIn: '30 minutes',
    logoUrl: 'https://example.com/logo.png',
    unsubscribeUrl: 'https://example.com/unsubscribe',
    ...testData
  };
  
  return render(templateName, previewContext);
}

/**
 * Get a list of all available email templates
 */
export async function listTemplates(): Promise<string[]> {
  try {
    const templates = await readFile(TEMPLATE_DIR);
    return templates
      .filter(file => file.endsWith('.hbs'))
      .map(file => file.replace('.hbs', ''));
  } catch (error) {
    console.error('Failed to list templates:', error);
    throw new Error('Failed to list templates');
  }
} 