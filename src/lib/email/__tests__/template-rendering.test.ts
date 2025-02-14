import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/utils/template';
import mjml2html from 'mjml';

// Mock dependencies
vi.mock('mjml', () => ({
  default: vi.fn((mjml: string) => ({
    html: '<html><body>Converted MJML</body></html>',
    errors: [],
  })),
}));

describe('Template Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('render', () => {
    it('should render a simple template with variables', async () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello {{name}}!</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const context = { name: 'John' };
      const rendered = await render('welcome', context);

      expect(rendered).toBeDefined();
      expect(rendered).toContain('Hello John!');
    });

    it('should handle nested variables', async () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Welcome {{user.name}}!</mj-text>
                <mj-text>Your email: {{user.email}}</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const context = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };

      const rendered = await render('welcome', context);

      expect(rendered).toBeDefined();
      expect(rendered).toContain('Welcome John!');
      expect(rendered).toContain('Your email: john@example.com');
    });

    it('should handle conditional rendering', async () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                {{#if isNewUser}}
                  <mj-text>Welcome new user!</mj-text>
                {{else}}
                  <mj-text>Welcome back!</mj-text>
                {{/if}}
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const newUserContext = { isNewUser: true };
      const returningUserContext = { isNewUser: false };

      const renderedNew = await render('welcome', newUserContext);
      const renderedReturning = await render('welcome', returningUserContext);

      expect(renderedNew).toContain('Welcome new user!');
      expect(renderedReturning).toContain('Welcome back!');
    });

    it('should handle arrays with iteration', async () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Your items:</mj-text>
                {{#each items}}
                  <mj-text>- {{this}}</mj-text>
                {{/each}}
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const context = {
        items: ['Item 1', 'Item 2', 'Item 3'],
      };

      const rendered = await render('welcome', context);

      expect(rendered).toContain('Item 1');
      expect(rendered).toContain('Item 2');
      expect(rendered).toContain('Item 3');
    });

    it('should handle missing variables gracefully', async () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello {{name}}!</mj-text>
                <mj-text>{{missingVar}}</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const context = { name: 'John' };
      const rendered = await render('welcome', context);

      expect(rendered).toContain('Hello John!');
      expect(rendered).not.toContain('{{missingVar}}');
    });

    it('should validate MJML structure', async () => {
      const invalidTemplate = `
        <mjml>
          <mj-body>
            <invalid-tag>Invalid MJML</invalid-tag>
          </mj-body>
        </mjml>
      `;

      vi.mocked(mjml2html).mockReturnValueOnce({
        html: '',
        errors: [{ line: 1, message: 'Invalid MJML structure' }],
      });

      await expect(render('invalid', {})).rejects.toThrow('MJML validation error');
    });

    it('should handle partial templates', async () => {
      const mainTemplate = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                {{> header}}
                <mj-text>Main content</mj-text>
                {{> footer}}
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const headerPartial = `
        <mj-text>Header: Welcome {{name}}</mj-text>
      `;

      const footerPartial = `
        <mj-text>Footer: Copyright {{year}}</mj-text>
      `;

      const context = {
        name: 'John',
        year: 2024,
      };

      const rendered = await render('welcome', context);

      expect(rendered).toContain('Header: Welcome John');
      expect(rendered).toContain('Main content');
      expect(rendered).toContain('Footer: Copyright 2024');
    });
  });
}); 