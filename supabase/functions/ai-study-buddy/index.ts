import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { corsHeaders as sharedCorsHeaders, optionsResponse, parseJsonBody, requirePost, requireUser } from '../_shared/http.ts';


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    const user = await requireUser(req);
    const { messages, sessionId, language = 'english', imageUrl } = await parseJsonBody<Record<string, unknown>>(req, 128_000);
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(JSON.stringify({ error: 'messages must contain between 1 and 100 items' }), { status: 400, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch student's performance data
    const { data: performance } = await supabase
      .from('performance')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, class_level')
      .eq('user_id', user.id)
      .single();

    // Build context-aware system prompt
    const performanceContext = performance && performance.length > 0
      ? `Recent performance: ${performance.map(p => 
          `${p.subject} (${p.topic}): ${p.score}%`
        ).join(', ')}`
      : 'No performance history yet';

    const systemPrompt = `You are an AI study buddy for Nigerian students. You help students learn in ${language}.

Student Profile:
- Name: ${profile?.full_name || 'Student'}
- Class Level: ${profile?.class_level || 'Not specified'}
- ${performanceContext}

Your responsibilities:
1. Answer questions clearly and accurately in ${language}
2. **Solve problems step-by-step**: When given a math problem, science question, or any exercise, show EVERY step of the solution with clear explanations for each step
3. Explain concepts using simple, relatable examples from Nigerian context
4. Provide personalized recommendations based on performance history
5. Encourage students and celebrate their progress
6. If a student is struggling with a topic (low scores), offer extra practice and simpler explanations
7. If a student excels in a topic (high scores), suggest advanced challenges
8. Use Nigerian cultural references when helpful (e.g., local foods, places, customs)

When solving problems:
- Show the full working/solution step by step
- Label each step clearly (Step 1, Step 2, etc.)
- Explain WHY each step is taken, not just what is done
- Give the final answer clearly marked as **Answer:**
- If relevant, provide alternative methods to solve the same problem
- After solving, suggest similar practice problems the student can try

When answering questions:
- Give thorough, detailed explanations
- Use bullet points and headers for clarity
- Include examples to illustrate concepts
- Reference the Nigerian curriculum where applicable
- Use markdown formatting (bold, lists, headers) for readability

Communication style:
- Friendly and encouraging
- Use simple language appropriate for the student's class level
- Break down complex topics into digestible parts
- Ask clarifying questions if needed
- Celebrate achievements and progress

Available subjects: Mathematics, English, Science, Social Studies, Basic Science, Basic Technology, Physics, Chemistry, Biology, Economics, Geography, Literature, Government, Civic Education, Agriculture, Business Studies, Home Economics, and Nigerian languages (Yoruba, Hausa, Igbo, French).`;

    // Build messages for the AI, handling image content
    const aiMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of messages) {
      if (msg.imageUrl) {
        // Multimodal message with image
        aiMessages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content || 'Please analyze this image and solve any problems or questions shown. Show all steps.' },
            { type: 'image_url', image_url: { url: msg.imageUrl } },
          ],
        });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Save messages to database
    if (sessionId) {
      // Save user message
      await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: messages[messages.length - 1].content,
      });

      // Save assistant message
      await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantMessage,
      });

      // Update session timestamp
      await supabase
        .from('ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
