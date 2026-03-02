import { describe, it, expect } from 'vitest';
import { getRecommendedExercise } from '@/lib/learning-recommendations';

describe('learning-recommendations', () => {
  const exercises = [
    { id: '1', title: 'Read A', category_id: 'cat-read', category_name: 'reading' },
    { id: '2', title: 'Write B', category_id: 'cat-write', category_name: 'writing' },
    { id: '3', title: 'Listen C', category_id: 'cat-listen', category_name: 'listening' },
  ];

  it('returns category_name in recommendation for weakest category', () => {
    const analytics = { weakest_category: 'cat-write', strongest_category: 'cat-read', exercises_attempted: 5 };
    const result = getRecommendedExercise(analytics, exercises, []);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('2');
    expect(result!.category_name).toBe('writing');
    expect(result!.reason).toBe('weakest_category');
  });

  it('returns category_name in fallback recommendation', () => {
    const analytics = { weakest_category: null, strongest_category: null, exercises_attempted: 0 };
    const result = getRecommendedExercise(analytics, exercises, []);
    expect(result).not.toBeNull();
    expect(result!.category_name).toBe('reading');
    expect(result!.reason).toBe('next_available');
  });

  it('returns null when all exercises completed', () => {
    const analytics = { weakest_category: null, strongest_category: null, exercises_attempted: 3 };
    const result = getRecommendedExercise(analytics, exercises, ['1', '2', '3']);
    expect(result).toBeNull();
  });

  it('link path matches /self-study/{category_name}/{id}', () => {
    const analytics = { weakest_category: 'cat-read', strongest_category: null, exercises_attempted: 1 };
    const result = getRecommendedExercise(analytics, exercises, []);
    expect(result).not.toBeNull();
    const path = `/self-study/${result!.category_name}/${result!.id}`;
    expect(path).toBe('/self-study/reading/1');
    expect(path).not.toContain('/all/');
  });
});
