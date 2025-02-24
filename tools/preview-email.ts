import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { previewTemplate, listTemplates } from '../src/utils/template';

const OUTPUT_DIR = join(process.cwd(), 'tmp/email-previews');

async function previewAllTemplates() {
  try {
    // Create output directory if it doesn't exist
    await mkdir(OUTPUT_DIR, { recursive: true });
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Get list of all templates
    const templates = await listTemplates();
    
    // Preview each template
    for (const templateName of templates) {
      console.log(`Previewing template: ${templateName}`);
      
      const html = await previewTemplate(templateName);
      const outputPath = join(OUTPUT_DIR, `${templateName}.html`);
      
      await writeFile(outputPath, html, 'utf-8');
      console.log(`Preview saved to: ${outputPath}`);
    }
    
    console.log('\nAll templates previewed successfully!');
    console.log(`Preview files are located in: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Failed to preview templates:', error);
    process.exit(1);
  }
}

// Run preview if called directly
if (require.main === module) {
  previewAllTemplates();
}

export { previewAllTemplates }; 