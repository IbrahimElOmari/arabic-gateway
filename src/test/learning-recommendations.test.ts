import { describe, it, expect } from 'vitest';
import { getRecommendedExercise } from '@/lib/learning-recommendations';

describe('getRecommendedExercise', () => {
  const exercises = [
    { id: '1', title: 'Reading A', category_id: 'cat-read', category_name: 'reading' },
    { id: '2', title: 'Writing A', category_id: 'cat-write', category_name: 'writing' },
    { id: '3', title: 'Grammar A', category_id: 'cat-gram', category_name: 'grammar' },
  ];

  it('returns null when no exercises available', () => {
    expect(getRecommendedExercise(null, [])).toBeNull();
  });

  it('returns null when all exercises completed', () => {
    expect(getRecommendedExercise(null, exercises, ['1', '2', '3'])).toBeNull();
  });

  it('recommends exercise from weakest category', () => {
    const analytics = { weakest_category: 'cat-write', strongest_category: 'cat-read', exercises_attempted: 5 };
    const result = getRecommendedExercise(analytics, exercises);
    expect(result?.id).toBe('2');
    expect(result?.reason).toBe('weakest_category');
  });

  it('falls back to next available when weakest category completed', () => {
    const analytics = { weakest_category: 'cat-write', strongest_category: 'cat-read', exercises_attempted: 5 };
    const result = getRecommendedExercise(analytics, exercises, ['2']);
    expect(result?.id).toBe('1');
    expect(result?.reason).toBe('next_available');
  });

  it('expects completed ids to be exercise ids, not attempt ids', () => {
    const analytics = { weakest_category: 'cat-write', strongest_category: 'cat-read', exercises_attempted: 5 };
    const completedExerciseIds = [{ id: 'attempt-9', exercise_id: '2', passed: true }]
      .filter((attempt) => attempt.passed)
      .map((attempt) => attempt.exercise_id);
    const result = getRecommendedExercise(analytics, exercises, completedExerciseIds);
    expect(result?.id).not.toBe('2');
  });

  it('returns first available when no analytics', () => {
    const result = getRecommendedExercise(null, exercises);
    expect(result?.id).toBe('1');
    expect(result?.reason).toBe('next_available');
  });

  it('matches by category_name as fallback', () => {
    const analytics = { weakest_category: 'grammar', strongest_category: null, exercises_attempted: 1 };
    const result = getRecommendedExercise(analytics, exercises);
    expect(result?.id).toBe('3');
    expect(result?.reason).toBe('weakest_category');
  });
});
