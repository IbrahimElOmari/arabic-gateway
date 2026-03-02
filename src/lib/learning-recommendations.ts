/**
 * Adaptive learning recommendations placeholder.
 * Suggests exercises based on student's weakest category.
 */

interface StudentAnalytics {
  weakest_category: string | null;
  strongest_category: string | null;
  exercises_attempted: number;
}

interface Exercise {
  id: string;
  title: string;
  category_id: string;
  category_name?: string;
}

export interface RecommendedExercise {
  id: string;
  title: string;
  reason: string;
  category_name?: string;
}

/**
 * Get the recommended next exercise for a student based on their analytics.
 * Prioritizes exercises from the weakest category.
 */
export function getRecommendedExercise(
  analytics: StudentAnalytics | null,
  availableExercises: Exercise[],
  completedExerciseIds: string[] = []
): RecommendedExercise | null {
  if (!availableExercises.length) return null;

  // Filter out completed exercises
  const remaining = availableExercises.filter(e => !completedExerciseIds.includes(e.id));
  if (!remaining.length) return null;

  // If we have analytics with a weakest category, prioritize that
  if (analytics?.weakest_category) {
    const weakExercise = remaining.find(
      e => e.category_id === analytics.weakest_category || e.category_name === analytics.weakest_category
    );
    if (weakExercise) {
      return {
        id: weakExercise.id,
        title: weakExercise.title,
        reason: 'weakest_category',
        category_name: weakExercise.category_name,
      };
    }
  }

  // Fallback: return the first available exercise
  return {
    id: remaining[0].id,
    title: remaining[0].title,
    reason: 'next_available',
    category_name: remaining[0].category_name,
  };
}
