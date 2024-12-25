import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

serve(async (req) => {
  // Add request validation
  if (!req.headers.get('authorization')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders } }
    )
  }

  // Add input sanitization
  const sanitizeInput = (input: string) => {
    return input.replace(/<[^>]*>/g, '');
  }

  try {
    const { messages, apiKey } = await req.json()

    // Validate and sanitize inputs
    if (!apiKey || !messages) {
      throw new Error('Invalid input parameters')
    }

    const sanitizedMessages = messages.map((msg: any) => ({
      ...msg,
      content: sanitizeInput(msg.content)
    }))

    // Rest of your existing code...
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders } }
    )
  }
})