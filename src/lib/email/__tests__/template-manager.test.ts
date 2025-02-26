import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateManager } from '../template-manager';
import mjml2html from 'mjml';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: 'test-id',
                    name: 'test-template',
                    html: '<html><body>Test</body></html>',
                    text: 'Test',
                    subject: 'Test Subject',
                    locale: 'en',
                    version: '1.0.0',
                    variables: []
                  },
                  error: null
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

vi.mock('mjml', () => ({
  default: vi.fn((mjml) => ({
    html: '<html><body>Converted MJML</body></html>',
    errors: []
  }))
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('Template content'),
  readdir: vi.fn().mockResolvedValue(['template1.mjml', 'template2.mjml']),
}));

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    templateManager = new TemplateManager();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('createTemplate', () => {
    it('should create a template with HTML content', async () => {
      const template = await templateManager.createTemplate({
        name: 'test-template',
        description: 'Test template',
        html: '<html><body>Test</body></html>',
        subject: 'Test Subject',
        category: 'transactional',
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('test-template');
      expect(template.html).toBe('<html><body>Test</body></html>');
      expect(createClient).toHaveBeenCalled();
    });

    it('should convert MJML to HTML when creating a template', async () => {
      const mjmlTemplate = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello World</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const template = await templateManager.createTemplate({
        name: 'mjml-template',
        description: 'MJML test template',
        html: mjmlTemplate,
        subject: 'MJML Test',
        category: 'transactional',
      });

      expect(template).toBeDefined();
      expect(mjml2html).toHaveBeenCalledWith(mjmlTemplate);
      expect(template.html).toBe('<html><body>Converted MJML</body></html>');
    });

    it('should throw an error if MJML conversion fails', async () => {
      vi.mocked(mjml2html).mockReturnValueOnce({
        html: '',
        errors: [{ line: 1, message: 'Invalid MJML' }],
      });

      const mjmlTemplate = '<mjml><invalid>Invalid MJML</invalid></mjml>';

      await expect(
        templateManager.createTemplate({
          name: 'invalid-mjml',
          description: 'Invalid MJML template',
          html: mjmlTemplate,
          subject: 'Invalid MJML',
          category: 'transactional',
        })
      ).rejects.toThrow('MJML conversion errors');
    });
  });

  describe('getTemplate', () => {
    it('should retrieve a template by name and locale', async () => {
      const template = await templateManager.getTemplate('test-template');

      expect(template).toBeDefined();
      expect(template?.name).toBe('test-template');
      expect(template?.locale).toBe('en');
    });

    it('should return null for non-existent template', async () => {
      vi.mocked(createClient()).from().select().eq().eq().order().limit().single
        .mockResolvedValueOnce({ data: null, error: null });

      const template = await templateManager.getTemplate('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('should update a template and create a new version', async () => {
      vi.mocked(createClient()).from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            version: '1.0.0',
            html: '<html><body>Old version</body></html>',
            text: 'Old version',
            subject: 'Old Subject',
            variables: [],
          },
          error: null,
        });

      const template = await templateManager.updateTemplate('test-id', {
        html: '<html><body>New version</body></html>',
        subject: 'New Subject',
      });

      expect(template).toBeDefined();
      expect(template.version).toBe('1.0.1');
    });

    it('should convert MJML when updating a template', async () => {
      vi.mocked(createClient()).from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            version: '1.0.0',
            html: '<html><body>Old version</body></html>',
            text: 'Old version',
            subject: 'Old Subject',
            variables: [],
          },
          error: null,
        });

      const mjmlTemplate = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Updated Content</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const template = await templateManager.updateTemplate('test-id', {
        html: mjmlTemplate,
      });

      expect(template).toBeDefined();
      expect(mjml2html).toHaveBeenCalledWith(mjmlTemplate);
      expect(template.html).toBe('<html><body>Converted MJML</body></html>');
    });
  });
}); 