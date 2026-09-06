import { describe, expect, it } from 'vitest';
import { calculatePercentage, isDoubleMarkingRequired, resolveGrade, selectQuestionIds } from './assessment';
import { safeEvidenceObjectPath, validateEvidenceFile } from './evidence';

describe('assessment foundations', () => {
  const questions = [
    { id: 'a', points: 2 },
    { id: 'b', points: 4 },
    { id: 'c', points: 6 },
  ];

  it('selects a deterministic randomized subset', () => {
    expect(selectQuestionIds(questions, 2, 'seed')).toEqual(selectQuestionIds(questions, 2, 'seed'));
    expect(selectQuestionIds(questions, 2, 'seed')).toHaveLength(2);
  });

  it('calculates bounded grades and double-marking policy', () => {
    expect(calculatePercentage(5, 10)).toBe(50);
    expect(resolveGrade(76, [{ label: 'A', minimumPercentage: 75 }, { label: 'B', minimumPercentage: 60 }])?.label).toBe('A');
    expect(isDoubleMarkingRequired('essay', 2)).toBe(true);
  });
});

describe('evidence foundations', () => {
  it('rejects unsafe or oversized evidence and scopes object paths', () => {
    expect(validateEvidenceFile({ name: 'x.exe', size: 100, type: 'application/x-msdownload' })).toEqual({ valid: false, reason: 'This file type is not supported.' });
    expect(safeEvidenceObjectPath('school/1', 'learner/1', 'evidence/1', 'my evidence?.pdf')).toContain('my_evidence_.pdf');
  });
});
