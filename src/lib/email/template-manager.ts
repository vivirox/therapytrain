import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logger';
import { EmailTemplate } from './email-service';
import mjml2html from 'mjml';

interface CreateTemplateOptions {
  name: string;
  description?: string;
  html: string;
  text?: string;
  subject: string;
  variables?: string[];
  category: 'transactional' | 'marketing' | 'notification';
  locale?: string;
}

interface UpdateTemplateOptions extends Partial<CreateTemplateOptions> {
  version?: string;
}

export class TemplateManager {
  private static instance: TemplateManager;
  private supabase;
  private logger: Logger;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.logger = Logger.getInstance();
  }

  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Create a new email template
   */
  public async createTemplate(options: CreateTemplateOptions): Promise<EmailTemplate> {
    try {
      const version = '1.0.0';
      const locale = options.locale || 'en';

      // Convert MJML to HTML if the template is in MJML format
      let html = options.html;
      if (options.html.trim().startsWith('<mjml>')) {
        const { html: convertedHtml, errors } = mjml2html(options.html);
        if (errors.length > 0) {
          throw new Error(`MJML conversion errors: ${JSON.stringify(errors)}`);
        }
        html = convertedHtml;
      }

      const { data, error } = await this.supabase
        .from('email_templates')
        .insert({
          name: options.name,
          description: options.description,
          version,
          html,
          text: options.text,
          subject: options.subject,
          variables: options.variables || [],
          category: options.category,
          locale,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.logger.info('Email template created', {
        name: options.name,
        version,
        locale,
      });

      return data;
    } catch (error) {
      await this.logger.error('Failed to create email template', error as Error);
      throw error;
    }
  }

  /**
   * Update an existing email template
   */
  public async updateTemplate(
    templateId: string,
    options: UpdateTemplateOptions
  ): Promise<EmailTemplate> {
    try {
      // If updating HTML content, create a new version
      if (options.html) {
        const { data: currentTemplate } = await this.supabase
          .from('email_templates')
          .select('version, html, text, subject, variables')
          .eq('id', templateId)
          .single();

        if (!currentTemplate) {
          throw new Error('Template not found');
        }

        // Increment version number
        const currentVersion = currentTemplate.version.split('.');
        const newVersion = `${currentVersion[0]}.${currentVersion[1]}.${
          parseInt(currentVersion[2]) + 1
        }`;

        // Store current version in version history
        await this.supabase.from('email_template_versions').insert({
          template_id: templateId,
          version: currentTemplate.version,
          html: currentTemplate.html,
          text: currentTemplate.text,
          subject: currentTemplate.subject,
          variables: currentTemplate.variables,
        });

        options.version = newVersion;
      }

      // Convert MJML to HTML if the template is in MJML format
      let html = options.html;
      if (html?.trim().startsWith('<mjml>')) {
        const { html: convertedHtml, errors } = mjml2html(html);
        if (errors.length > 0) {
          throw new Error(`MJML conversion errors: ${JSON.stringify(errors)}`);
        }
        html = convertedHtml;
      }

      const { data, error } = await this.supabase
        .from('email_templates')
        .update({
          ...options,
          html,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.logger.info('Email template updated', {
        templateId,
        version: options.version,
      });

      return data;
    } catch (error) {
      await this.logger.error('Failed to update email template', error as Error);
      throw error;
    }
  }

  /**
   * Get a template by name and locale
   */
  public async getTemplate(
    name: string,
    locale: string = 'en'
  ): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_templates')
        .select()
        .eq('name', name)
        .eq('locale', locale)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      await this.logger.error('Failed to get email template', error as Error);
      throw error;
    }
  }

  /**
   * List all templates
   */
  public async listTemplates(
    category?: 'transactional' | 'marketing' | 'notification',
    locale: string = 'en'
  ): Promise<EmailTemplate[]> {
    try {
      let query = this.supabase
        .from('email_templates')
        .select()
        .eq('is_active', true)
        .eq('locale', locale);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      await this.logger.error('Failed to list email templates', error as Error);
      throw error;
    }
  }

  /**
   * Get template version history
   */
  public async getTemplateVersions(templateId: string): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('email_template_versions')
        .select()
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      await this.logger.error('Failed to get template versions', error as Error);
      throw error;
    }
  }

  /**
   * Delete a template (soft delete)
   */
  public async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) {
        throw error;
      }

      await this.logger.info('Email template deleted', { templateId });
    } catch (error) {
      await this.logger.error('Failed to delete email template', error as Error);
      throw error;
    }
  }
} 