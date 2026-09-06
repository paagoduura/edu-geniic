import { createClient } from 'npm:@supabase/supabase-js@2';
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody, requirePost, requireUser, safeError, optionalString, RequestError } from '../_shared/http.ts';

type RequestBody = { subject?: unknown; action?: unknown; userId?: unknown };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);

  try {
    requirePost(req);
    const user = await requireUser(req);
    const body = await parseJsonBody<RequestBody>(req, 16_000);
    const subject = optionalString(body.subject, 'subject', 120);

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!serviceKey || !supabaseUrl) throw new RequestError(500, 'CONFIGURATION_ERROR', 'Database service is not configured.');
    const supabase = createClient(supabaseUrl, serviceKey);

    let performanceQuery = supabase
      .from('performance')
      .select('id, subject, topic, score, feedback, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (subject) performanceQuery = performanceQuery.eq('subject', subject);

    const [{ data: performance, error: performanceError }, { data: quizzes, error: quizError }] = await Promise.all([
      performanceQuery,
      supabase.from('quizzes').select('id, lesson_id, score, completed_at, time_spent').eq('student_id', user.id).not('score', 'is', null).order('completed_at', { ascending: false }).limit(500),
    ]);
    if (performanceError) throw performanceError;
    if (quizError) throw quizError;

    const analytics = calculateAnalytics(performance ?? [], quizzes ?? []);
    return jsonResponse(req, { performance: performance ?? [], quizzes: quizzes ?? [], analytics, recommendations: getAdaptiveRecommendations(analytics) });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.status, safe.code, safe.message);
  }
});

function calculateAnalytics(performance: Array<Record<string, unknown>>, quizzes: Array<Record<string, unknown>>) {
  const scores = [...performance.map((item) => Number(item.score)).filter(Number.isFinite), ...quizzes.map((item) => Number(item.score)).filter(Number.isFinite)];
  if (scores.length === 0) return { totalAttempts: 0, averageScore: 0, highestScore: 0, lowestScore: 0, recentTrend: 'no-data', subjectBreakdown: {}, improvementRate: 0, masteredTopics: [], strugglingTopics: [] };

  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const subjectBreakdown: Record<string, { count: number; avgScore: number }> = {};
  const topicScores: Record<string, number[]> = {};
  for (const item of performance) {
    const subject = String(item.subject ?? 'general');
    const topic = String(item.topic ?? 'general');
    const score = Number(item.score);
    if (!Number.isFinite(score)) continue;
    subjectBreakdown[subject] ??= { count: 0, avgScore: 0 };
    subjectBreakdown[subject].count += 1;
    subjectBreakdown[subject].avgScore += score;
    topicScores[topic] ??= [];
    topicScores[topic].push(score);
  }
  for (const value of Object.values(subjectBreakdown)) value.avgScore = Math.round(value.avgScore / value.count);

  const recent = scores.slice(0, 5);
  const older = scores.slice(5, 10);
  const recentAverage = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const olderAverage = older.length ? older.reduce((sum, score) => sum + score, 0) / older.length : recentAverage;
  const recentTrend = recentAverage > olderAverage + 5 ? 'improving' : recentAverage < olderAverage - 5 ? 'declining' : 'stable';
  const masteredTopics = Object.entries(topicScores).filter(([, values]) => values.length >= 2 && values.reduce((a, b) => a + b, 0) / values.length >= 80).map(([topic]) => topic);
  const strugglingTopics = Object.entries(topicScores).filter(([, values]) => values.length >= 2 && values.reduce((a, b) => a + b, 0) / values.length < 50).map(([topic]) => topic);

  return {
    totalAttempts: scores.length,
    averageScore,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    recentTrend,
    subjectBreakdown,
    improvementRate: olderAverage > 0 ? Math.round(((recentAverage - olderAverage) / olderAverage) * 100) : 0,
    masteredTopics,
    strugglingTopics,
  };
}

function getAdaptiveRecommendations(analytics: any) {
  const recommendations: Array<Record<string, unknown>> = [];
  if (analytics.averageScore >= 80) recommendations.push({ type: 'increase-difficulty', title: 'Ready for a Challenge', description: 'Your performance is excellent! Try harder difficulty levels.', action: 'increase', priority: 'high' });
  else if (analytics.averageScore < 50) recommendations.push({ type: 'decrease-difficulty', title: 'Build Your Foundation', description: 'Focus on easier materials first to strengthen your understanding.', action: 'decrease', priority: 'high' });
  if (analytics.strugglingTopics.length) recommendations.push({ type: 'review-topics', title: 'Topics to Review', description: `Focus on: ${analytics.strugglingTopics.join(', ')}`, topics: analytics.strugglingTopics, priority: 'high' });
  if (analytics.masteredTopics.length) recommendations.push({ type: 'mastered-topics', title: 'Well Done!', description: `You've mastered: ${analytics.masteredTopics.join(', ')}`, topics: analytics.masteredTopics, priority: 'low' });
  if (analytics.recentTrend === 'declining') recommendations.push({ type: 'practice-more', title: 'Keep Practicing', description: 'Your recent scores show a dip. Regular practice will help.', priority: 'medium' });
  else if (analytics.recentTrend === 'improving') recommendations.push({ type: 'keep-momentum', title: 'Great Progress!', description: 'Your scores are improving. Keep up the excellent work!', priority: 'low' });
  return recommendations;
}
