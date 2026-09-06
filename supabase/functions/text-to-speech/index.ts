import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, fetchWithTimeout, optionsResponse, parseJsonBody, requirePost, requireUser, safeError, requiredString } from '../_shared/http.ts';

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    await requireUser(req);
    const { text, voice = 'alloy' } = await parseJsonBody<Record<string, unknown>>(req, 24_000);
    const inputText = requiredString(text, 'text', 20_000);
    const selectedVoice = requiredString(voice, 'voice', 32);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Text-to-speech service not configured' }),
        { status: 500, headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
      );
    }

    console.log(`Generating speech for text length: ${inputText.length}, voice: ${selectedVoice}`);

    // Call OpenAI TTS API
    const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: inputText,
        voice: selectedVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: corsHeaders(req, { 'Content-Type': 'application/json' }) }
        );
      }
      
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = encodeBase64(new Uint8Array(arrayBuffer));

    console.log('Speech generated successfully');

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: corsHeaders(req, { 'Content-Type': 'application/json' }),
      },
    );
  } catch (error) {
    const failure = safeError(error);
    return errorResponse(req, failure.status, failure.code, failure.message);
  }
});
