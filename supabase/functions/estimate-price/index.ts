import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface EstimateInput {
  id_level: number;
  login_method: 'FB' | 'Google' | 'VK';
  key_items: string;
  is_email_binded: boolean;
}

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

    const body = (await req.json()) as Partial<EstimateInput>;
    const level = Number(body.id_level);
    const login = body.login_method;
    const items = (body.key_items ?? '').toString().slice(0, 1500);
    const bound = !!body.is_email_binded;

    if (!level || level < 1 || !['FB', 'Google', 'VK'].includes(login as string)) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = `You are a Free Fire MAX account pricing expert for the Indian market (INR ₹).
Estimate a fair selling price range for an account given its details.
Rules:
- All prices in ₹ (Indian Rupees).
- Typical range: ₹100 (low level, no rare items) to ₹15000 (max level, multiple evo guns + rare bundles).
- Email-bound accounts are worth ~20-40% more (safer for buyer).
- Google login > Facebook login > VK login (in trust).
- Higher level + rare bundles (Cobra, DJ Alok, Chrono, Magic Cube, Evo Gun MP40/SCAR/M1014) raise price significantly.
Return ONLY valid JSON: {"low": number, "high": number, "suggested": number, "confidence": "low"|"medium"|"high", "reasoning": "short string under 200 chars"}`;

    const user = `Level: ${level}
Login: ${login}
Email bound: ${bound ? 'Yes' : 'No'}
Key items / bundles / weapons:
${items || '(not specified)'}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'native-fetch',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
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
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '{}';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const low = Math.max(50, Math.round(Number(parsed.low ?? 100)));
    const high = Math.max(low, Math.round(Number(parsed.high ?? low * 2)));
    const suggested = Math.max(low, Math.min(high, Math.round(Number(parsed.suggested ?? (low + high) / 2))));
    const confidence = ['low', 'medium', 'high'].includes(String(parsed.confidence))
      ? String(parsed.confidence)
      : 'medium';
    const reasoning = String(parsed.reasoning ?? '').slice(0, 250);

    return new Response(
      JSON.stringify({ low, high, suggested, confidence, reasoning }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'unhandled', detail: String(err).slice(0, 300) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
