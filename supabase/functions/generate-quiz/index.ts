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
    const { subject, classLevel, topic, difficulty = 'medium', lessonId } = await parseJsonBody<Record<string, unknown>>(req, 16_000);
    const userId = user.id;

    if (!subject || !classLevel || !topic) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, classLevel, topic' }),
        { status: 400, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating quiz for ${subject} - ${classLevel} - ${topic} at ${difficulty} difficulty`);

    const systemPrompt = `You are an expert Nigerian educator creating NERDC-aligned quizzes for students.

Generate a comprehensive quiz with exactly 10 questions for:
- Subject: ${subject}
- Class Level: ${classLevel}
- Topic: ${topic}
- Difficulty: ${difficulty}

INSTRUCTIONS:
1. Create diverse question types: 60% multiple choice, 30% true/false, 10% short answer
2. Align with NERDC curriculum standards
3. Use Nigerian context and local examples
4. Adjust difficulty: easy (basic recall), medium (application), hard (analysis/synthesis)
5. Provide clear, concise explanations for correct answers
6. Include 4 options for multiple choice questions

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "question": "question text",
      "type": "multiple-choice" | "true-false" | "short-answer",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "correct option or answer",
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
          { role: 'user', content: `Create a ${difficulty} difficulty quiz about ${topic}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let quizData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      quizData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz structure from AI');
    }

    console.log(`Generated quiz with ${quizData.questions.length} questions`);

    // Save quiz to database if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: quiz, error: insertError } = await supabase
        .from('quizzes')
        .insert({
          student_id: userId,
          lesson_id: lessonId || null,
          difficulty: difficulty,
          questions: quizData.questions,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error saving quiz:', insertError);
        throw new Error('Failed to save quiz to database');
      }

      console.log('Quiz saved to database with ID:', quiz.id);
      return new Response(
        JSON.stringify({ quiz, questions: quizData.questions }),
        { headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ questions: quizData.questions }),
      { headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...sharedCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});