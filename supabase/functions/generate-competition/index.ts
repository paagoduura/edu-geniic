import { corsHeaders as sharedCorsHeaders, optionsResponse, errorResponse, parseJsonBody, requirePost, requireUser, safeError } from '../_shared/http.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    const user = await requireUser(req);
    const { title, description, competitionType, subject, classLevel, difficulty = 'medium', timeLimitMinutes = 30, startTime, endTime } = await parseJsonBody<Record<string, unknown>>(req, 32_000);
    const createdBy = user.id;

    if (!title || !subject || !competitionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, subject, competitionType, createdBy' }),
        { status: 400, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const questionCount = competitionType === 'school' ? 20 : 10;

    const systemPrompt = `You are an expert Nigerian educator creating competition quiz questions.

Generate exactly ${questionCount} multiple-choice questions for a ${competitionType} competition:
- Subject: ${subject}
- Class Level: ${classLevel || 'General'}
- Difficulty: ${difficulty}

INSTRUCTIONS:
1. All questions must be multiple-choice with exactly 4 options
2. Align with NERDC curriculum standards
3. Use Nigerian context and examples where appropriate
4. Questions should be challenging but fair for competition
5. Mix difficulty within the set - some easier warm-ups and harder questions
6. Provide clear explanations

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "correct option text",
      "explanation": "why this is correct",
      "points": 10
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create ${questionCount} competition questions about ${subject} at ${difficulty} difficulty` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }), { status: 429, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No AI response');

    let quizData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      quizData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      throw new Error('Failed to parse AI response');
    }

    if (!quizData.questions?.length) throw new Error('Invalid quiz structure');

    // Save competition to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use provided times or default to now + time limit
    const computedStartTime = startTime || new Date().toISOString();
    const computedEndTime = endTime || new Date(new Date(computedStartTime).getTime() + timeLimitMinutes * 60 * 1000).toISOString();

    // Determine initial status
    const now = new Date();
    const startDate = new Date(computedStartTime);
    let initialStatus = 'active';
    if (startDate > now) {
      initialStatus = 'pending';
    }

    const { data: competition, error: insertError } = await supabase
      .from('competitions')
      .insert({
        title,
        description: description || `${subject} ${competitionType} competition`,
        competition_type: competitionType,
        subject,
        class_level: classLevel || null,
        difficulty,
        questions: quizData.questions,
        time_limit_minutes: timeLimitMinutes,
        status: initialStatus,
        created_by: createdBy,
        start_time: computedStartTime,
        end_time: computedEndTime,
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB error:', insertError);
      throw new Error('Failed to save competition');
    }

    return new Response(
      JSON.stringify({ competition, questions: quizData.questions }),
      { headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
