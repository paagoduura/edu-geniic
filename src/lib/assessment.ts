export type AssessmentQuestion = {
  id: string;
  points: number;
  competencyId?: string;
};

export type GradeBoundary = {
  label: string;
  minimumPercentage: number;
  gradePoint?: number;
};

export const selectQuestionIds = <T extends AssessmentQuestion>(
  questions: T[],
  count: number,
  seed: string,
): T[] => {
  if (!Number.isInteger(count) || count < 1) return [];
  const pool = [...questions];
  let state = [...seed].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  const nextRandom = () => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

export const calculatePercentage = (earned: number, available: number): number => {
  if (!Number.isFinite(earned) || !Number.isFinite(available) || available <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, (earned / available) * 100)) * 100) / 100;
};

export const resolveGrade = (percentage: number, boundaries: GradeBoundary[]): GradeBoundary | null =>
  [...boundaries]
    .sort((a, b) => b.minimumPercentage - a.minimumPercentage)
    .find((boundary) => percentage >= boundary.minimumPercentage) ?? null;

export const isDoubleMarkingRequired = (questionType: string, points: number): boolean =>
  ['essay', 'practical'].includes(questionType) || points >= 10;
