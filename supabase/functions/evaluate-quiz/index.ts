import { createClient } from 'npm:@supabase/supabase-js@2';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody, requirePost, requireUser, safeError, requiredString, RequestError } from '../_shared/http.ts';

type QuizQuestion = {
  question: string;
  type: string;
  correctAnswer: string;
  points?: number;
  explanation?: string;
};

type RequestBody = { quizId?: unknown; answers?: unknown; timeSpent?: unknown; userId?: unknown };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);

  try {
    requirePost(req);
    const user = await requireUser(req);
    const body = await parseJsonBody<RequestBody>(req, 128_000);
    const quizId = requiredString(body.quizId, 'quizId', 100);
    if (!Array.isArray(body.answers) || body.answers.length > 500) {
      throw new RequestError(400, 'INVALID_INPUT', 'answers must be an array with at most 500 items.');
    }
    const answers = body.answers.map((answer) => typeof answer === 'string' ? answer.slice(0, 2000) : '');
    const timeSpent = typeof body.timeSpent === 'number' && Number.isFinite(body.timeSpent) && body.timeSpent >= 0
      ? Math.min(Math.round(body.timeSpent), 86_400)
      : null;

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!serviceKey || !supabaseUrl) throw new RequestError(500, 'CONFIGURATION_ERROR', 'Database service is not configured.');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: quiz, error: fetchError } = await supabase
      .from('quizzes')
      .select('id, student_id, lesson_id, questions')
      .eq('id', quizId)
      .eq('student_id', user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!quiz) throw new RequestError(404, 'NOT_FOUND', 'Quiz not found.');

    const questions = Array.isArray(quiz.questions) ? quiz.questions as QuizQuestion[] : [];
    if (questions.length === 0) throw new RequestError(422, 'INVALID_QUIZ', 'This quiz has no gradeable questions.');

    let totalScore = 0;
    let maxScore = 0;
    const results = questions.map((question, index) => {
      const points = Number.isFinite(question.points) && Number(question.points) > 0 ? Number(question.points) : 10;
      maxScore += points;
      const expected = String(question.correctAnswer ?? '').trim().toLowerCase();
      const actual = String(answers[index] ?? '').trim().toLowerCase();
      let isCorrect = false;
      if (actual && expected && (question.type === 'multiple-choice' || question.type === 'true-false')) {
        isCorrect = actual === expected;
      } else if (actual && expected && question.type === 'short-answer') {
        isCorrect = actual === expected || (expected.length >= 3 && (expected.includes(actual) || actual.includes(expected)));
      }
      if (isCorrect) totalScore += points;
      return {
        questionIndex: index,
        question: String(question.question ?? ''),
        userAnswer: answers[index] ?? '',
        correctAnswer: String(question.correctAnswer ?? ''),
        isCorrect,
        points: isCorrect ? points : 0,
        explanation: String(question.explanation ?? ''),
      };
    });

    const percentageScore = Math.round((totalScore / maxScore) * 100);
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({ answers, score: percentageScore, completed_at: new Date().toISOString(), time_spent: timeSpent })
      .eq('id', quizId)
      .eq('student_id', user.id);
    if (updateError) throw updateError;

    const { error: performanceError } = await supabase.from('performance').insert({
      student_id: user.id,
      subject: quiz.lesson_id ? 'mixed' : 'general',
      topic: 'Quiz Assessment',
      score: percentageScore,
      feedback: `Scored ${totalScore}/${maxScore} points. ${percentageScore >= 80 ? 'Excellent work!' : percentageScore >= 50 ? 'Good effort, keep practicing!' : 'Keep studying, you can improve!'}`,
    });
    if (performanceError) console.error('Performance record failed:', performanceError.message);

    return jsonResponse(req, { totalScore, maxScore, percentageScore, results, feedback: generateFeedback(percentageScore), recommendation: getRecommendation(percentageScore) });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.status, safe.code, safe.message);
  }
});

function generateFeedback(score: number): string {
  if (score >= 90) return 'Outstanding! You have mastered this topic.';
  if (score >= 80) return 'Excellent work! You have a strong understanding.';
  if (score >= 70) return 'Good job! You understand most of the material.';
  if (score >= 60) return 'Fair performance. Review the material and try again.';
  if (score >= 50) return 'You need more practice. Study the lesson again.';
  return 'Keep trying! Review the basics and practice more.';
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'Ready for harder material. Try increasing difficulty level.';
  if (score >= 50) return 'Practice more at this level before moving forward.';
  return 'Review the lesson content and try easier questions first.';
}
