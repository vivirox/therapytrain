import "https://deno.land/x/xhr@0.1.0/mod.ts"

const OLLAMA_API_URL = "https://api.gemcity.xyz"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message, clientContext } = await req.json()

    // Create a system prompt that sets up the role-playing context
    const systemPrompt = `You are role-playing as a therapy client with the following characteristics:
    - Name: ${clientContext.name}
    - Age: ${clientContext.age}
    - Primary Issue: ${clientContext.primaryIssue}
    - Background: ${clientContext.background}
    - Key Traits: ${clientContext.keyTraits.join(', ')}
    - Case Complexity: ${clientContext.complexity}
    
    Respond in character, maintaining consistency with these traits and background.`

    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "falcon3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function serve(arg0: (req: any) => Promise<Response>) {
  throw new Error("Function not implemented.")
}
