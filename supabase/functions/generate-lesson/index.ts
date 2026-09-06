import { corsHeaders as sharedCorsHeaders, optionsResponse, errorResponse, parseJsonBody, requirePost, requireUser, safeError } from '../_shared/http.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    const user = await requireUser(req);
    const { subject, classLevel, topic } = await parseJsonBody<Record<string, unknown>>(req, 16_000);
    const userId = user.id;
    
    console.log('Generating lesson:', { subject, classLevel, topic, userId });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert Nigerian education content creator specializing in the NERDC (Nigerian Educational Research and Development Council) curriculum. 

Your task is to generate comprehensive, engaging lessons for Nigerian students from Primary 1 to SS3. 

Key requirements:
- Follow NERDC curriculum standards strictly
- Use Nigerian context and local examples (e.g., Lagos, Kano, Port Harcourt, Nigerian currency - Naira)
- Make content age-appropriate for the specified class level
- Include clear learning objectives
- Provide step-by-step explanations
- Use relatable Nigerian scenarios and cultural references
- Include 3-5 practical examples
- Add 5-8 practice exercises with varying difficulty levels
- Make the content engaging and easy to understand

Format your response as a structured JSON object with the following fields:
{
  "title": "Lesson title",
  "objectives": ["objective 1", "objective 2", ...],
  "introduction": "Brief engaging introduction",
  "content": {
    "sections": [
      {
        "heading": "Section title",
        "explanation": "Detailed explanation",
        "keyPoints": ["point 1", "point 2", ...]
      }
    ]
  },
  "examples": [
    {
      "title": "Example title",
      "description": "Example explanation with Nigerian context"
    }
  ],
  "exercises": [
    {
      "question": "Exercise question",
      "difficulty": "easy|medium|hard",
      "answer": "Expected answer or solution approach"
    }
  ],
  "summary": "Brief lesson summary"
}`;

    const userPrompt = `Generate a NERDC-aligned lesson for:
Subject: ${subject}
Class Level: ${classLevel}
Topic: ${topic}

Make this lesson comprehensive, engaging, and appropriate for Nigerian ${classLevel} students. Include local examples and cultural references.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    
    console.log('Generated content:', generatedContent);

    // Parse the JSON response from the AI
    let lessonData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                        generatedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      lessonData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: return raw content if JSON parsing fails
      lessonData = {
        title: topic,
        content: { raw: generatedContent },
        objectives: [],
        examples: [],
        exercises: []
      };
    }

    // Save to database if userId is provided
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: savedLesson, error: saveError } = await supabase
        .from('lessons')
        .insert({
          subject: subject.toLowerCase().replace(/ /g, '_'),
          class_level: classLevel,
          title: lessonData.title || topic,
          content: lessonData,
          objectives: lessonData.objectives || [],
          examples: lessonData.examples || [],
          exercises: lessonData.exercises || [],
          created_by: userId,
          is_approved: false
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving lesson:', saveError);
      } else {
        console.log('Lesson saved:', savedLesson.id);
        lessonData.id = savedLesson.id;
      }
    }

    return new Response(
      JSON.stringify({ lesson: lessonData }),
      { headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in generate-lesson function:', error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
