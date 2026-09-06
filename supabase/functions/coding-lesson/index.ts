import { corsHeaders as sharedCorsHeaders, optionsResponse, errorResponse, parseJsonBody, requirePost, requireUser, safeError } from '../_shared/http.ts';

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  try {
    requirePost(req);
    await requireUser(req);
    const { action, language, level, topic, code, lessonContent } = await parseJsonBody<Record<string, unknown>>(req, 64_000);

    if (!action) {
      return new Response(
        JSON.stringify({ error: "action is required" }),
        { status: 400, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_lesson") {
      systemPrompt = `You are an expert coding teacher for Nigerian students. You teach programming in a fun, engaging way with Nigerian context and examples.
You can teach: JavaScript, Python, HTML, CSS, React, TypeScript, Expo, and React Native.
      
Your lessons should:
- Be age-appropriate for the student's class level
- Use simple, clear language
- Include Nigerian-context examples (e.g., calculating naira prices, student names like Chioma, Emeka, Aisha)
- Progress from basic to more complex concepts
- Include code examples that students can try themselves
- For HTML/CSS: focus on building web pages with practical examples
- For React/TypeScript: teach component-based thinking and type safety
- For Expo/React Native: teach mobile app development concepts with practical UI examples

Format your response as JSON with this structure:
{
  "title": "Lesson title",
  "introduction": "Brief engaging intro",
  "concepts": [
    {
      "name": "Concept name",
      "explanation": "Clear explanation",
      "codeExample": "// Code example here",
      "output": "Expected output"
    }
  ],
  "practiceProblems": [
    {
      "id": 1,
      "title": "Problem title",
      "description": "What the student should do",
      "hint": "A helpful hint",
      "starterCode": "// Starter code",
      "solution": "// Solution code",
      "expectedOutput": "Expected output"
    }
  ],
  "summary": "Key takeaways"
}`;

      const levelMap: Record<string, string> = {
        primary: "Primary school (ages 6-11) - very basic, visual, fun",
        junior_secondary: "Junior Secondary (ages 12-14) - introductory real coding",
        senior_secondary: "Senior Secondary (ages 15-17) - intermediate coding concepts",
      };

      userPrompt = `Create a ${language} coding lesson about "${topic}" for ${levelMap[level] || level} students. Make it engaging and educational with 2-3 concepts and 2-3 practice problems.`;
    } else if (action === "evaluate_code") {
      systemPrompt = `You are a friendly coding tutor for Nigerian students. Evaluate their code and provide helpful, encouraging feedback.

Format your response as JSON:
{
  "isCorrect": true/false,
  "output": "What the code would produce",
  "feedback": "Encouraging feedback with explanation",
  "hints": ["Hint 1 if incorrect"],
  "correctedCode": "// Only if there are errors, show the fix"
}

Be encouraging! Use phrases like "Great effort!", "You're getting closer!", "Well done!". 
If the code has errors, explain them simply and kindly.`;

      userPrompt = `The student is working on this problem:
${lessonContent || "General coding practice"}

They wrote this ${language} code:
\`\`\`${language}
${code}
\`\`\`

Evaluate their code. Is it correct? What would it output? Give feedback.`;
    } else if (action === "get_hint") {
      systemPrompt = `You are a helpful coding tutor. Give a brief, encouraging hint without giving away the full solution. Use simple language appropriate for young Nigerian students.`;
      
      userPrompt = `The student needs a hint for this problem:
${lessonContent}

They have written so far:
\`\`\`${language}
${code || "// Nothing yet"}
\`\`\`

Give them a helpful hint to guide them toward the solution without revealing it entirely.`;
    } else if (action === "get_topics") {
      systemPrompt = `You are a coding curriculum designer. Return a JSON array of coding topics appropriate for the given level and language.

Format: { "topics": [{ "id": "topic_id", "title": "Topic Title", "description": "Brief description", "difficulty": "beginner|intermediate|advanced", "icon": "emoji" }] }`;

      const levelMap: Record<string, string> = {
        primary: "Primary school (ages 6-11)",
        junior_secondary: "Junior Secondary (ages 12-14)",
        senior_secondary: "Senior Secondary (ages 15-17)",
      };

      userPrompt = `List 8-10 ${language} coding topics appropriate for ${levelMap[level] || level} students, ordered from easiest to hardest. Include fun, engaging titles.`;
    }

    const response = await fetch(LOVABLE_API_URL, {
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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...sharedCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
