import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { load } from 'js-yaml';

/**
 * Serves the OpenAPI specification in YAML format
 * @route GET /api/openapi.yaml
 * @returns {Promise<NextResponse>} OpenAPI specification in YAML format
 */
export async function GET() {
  try {
    // Read the OpenAPI spec file
    const specPath = join(process.cwd(), 'docs/api/openapi/openapi.yaml');
    const yamlContent = await readFile(specPath, 'utf8');

    // Parse YAML to validate it
    load(yamlContent);

    // Return the YAML content with proper content type
    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'application/yaml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving OpenAPI spec:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to load OpenAPI specification',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 