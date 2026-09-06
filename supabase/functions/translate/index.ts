import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, optionsResponse, parseJsonBody, requirePost, requireUser, safeError, requiredString } from '../_shared/http.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    await requireUser(req);
    const { text, targetLanguage, sourceLanguage = 'en' } = await parseJsonBody<Record<string, unknown>>(req, 24_000);
    const inputText = requiredString(text, 'text', 20_000);
    const target = requiredString(targetLanguage, 'targetLanguage', 40);
    const source = typeof sourceLanguage === 'string' ? sourceLanguage.trim().slice(0, 40) : 'en';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Translation service not configured' }),
        { status: 500, headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
      );
    }

    console.log(`Translating from ${source} to ${target}`);

    const languageNames: Record<string, string> = {
      'en': 'English',
      'ha': 'Hausa',
      'yo': 'Yoruba',
      'ig': 'Igbo',
      'fr': 'French',
    };

    const systemPrompt = `You are a professional translator specializing in Nigerian languages and educational content.

Translate the following text accurately while:
1. Preserving educational terminology and concepts
2. Maintaining cultural context appropriate for Nigerian students
3. Keeping technical terms clear and understandable
4. Using formal, educational language suitable for classroom use

Translate from ${languageNames[source] || source} to ${languageNames[target] || target}.

Return ONLY the translated text, no explanations or metadata.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices?.[0]?.message?.content;

    if (!translatedText) {
      throw new Error('No translation in AI response');
    }

    console.log('Translation completed successfully');

    return new Response(
      JSON.stringify({ 
        translatedText: translatedText.trim(),
        sourceLanguage,
        targetLanguage,
      }),
      { headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
    );

  } catch (error) {
    const failure = safeError(error);
    return errorResponse(req, failure.status, failure.code, failure.message);
  }
});
