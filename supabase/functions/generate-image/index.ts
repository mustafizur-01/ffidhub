const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? '').trim().slice(0, 1200);
    const source = String(body?.source ?? 'unknown').slice(0, 40);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let userId: string | null = null;
    try {
      const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
      if (jwt) {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        userId = payload?.sub ?? null;
      }
    } catch { /* anonymous */ }

    const logGeneration = async (success: boolean) => {
      if (!supabaseUrl || !serviceKey) return;
      try {
        await fetch(`${supabaseUrl}/rest/v1/ai_image_generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ user_id: userId, source, prompt: prompt.slice(0, 500), success }),
        });
      } catch { /* logging must never break generation */ }
    };

    if (prompt.length < 3) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'native-fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'credits_exhausted' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: 'ai_error', detail: t.slice(0, 300) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const image: string | undefined =
      aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!image) {
      return new Response(JSON.stringify({ error: 'no_image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ image }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'unhandled', detail: String(err).slice(0, 300) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
