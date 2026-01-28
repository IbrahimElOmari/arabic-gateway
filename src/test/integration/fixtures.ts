/**
 * Test fixtures for integration testing
 * These provide consistent test data for Supabase operations
 */

export const testUser = {
  id: "test-user-id-123",
  email: "student@test.com",
  full_name: "Test Student",
  phone: "+31612345678",
  address: "Teststraat 123, 1234 AB Amsterdam",
  date_of_birth: "1995-05-15",
  study_level: "beginner",
};

export const testTeacher = {
  id: "test-teacher-id-456",
  email: "teacher@test.com",
  full_name: "Test Teacher",
  role: "teacher",
};

export const testAdmin = {
  id: "test-admin-id-789",
  email: "admin@test.com",
  full_name: "Test Admin",
  role: "admin",
};

export const testLevel = {
  id: "test-level-id",
  name: "beginner",
  name_nl: "Beginner",
  name_en: "Beginner",
  name_ar: "مبتدئ",
  display_order: 1,
};

export const testClass = {
  id: "test-class-id",
  name: "Arabisch voor Beginners",
  description: "Introductiecursus Arabisch",
  level_id: "test-level-id",
  teacher_id: "test-teacher-id-456",
  price: 299.99,
  currency: "EUR",
  max_students: 50,
  is_active: true,
};

export const testEnrollment = {
  id: "test-enrollment-id",
  class_id: "test-class-id",
  student_id: "test-user-id-123",
  status: "enrolled",
};

export const testEvent = {
  id: "test-event-id",
  creator_id: "test-user-id-123",
  target_type: "user" as const,
  target_id: "test-user-id-123",
  title: "Study Arabic",
  description: "Daily study session",
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 3600000).toISOString(),
  all_day: false,
  event_type: "personal" as const,
  color: "#6366f1",
};

export const testLesson = {
  id: "test-lesson-id",
  class_id: "test-class-id",
  title: "Introduction to Arabic Script",
  description: "Learn the Arabic alphabet",
  scheduled_at: new Date(Date.now() + 86400000).toISOString(),
  duration_minutes: 90,
  status: "scheduled",
  created_by: "test-teacher-id-456",
};

export const testExercise = {
  id: "test-exercise-id",
  class_id: "test-class-id",
  category_id: "test-category-id",
  title: "Reading Practice",
  description: "Practice reading Arabic text",
  is_published: true,
  release_date: new Date().toISOString(),
  passing_score: 60,
  max_attempts: 3,
  created_by: "test-teacher-id-456",
};

export const testForumRoom = {
  id: "test-room-id",
  name: "general",
  name_nl: "Algemeen",
  name_en: "General",
  name_ar: "عام",
  icon: "message-circle",
  display_order: 1,
};

export const testForumPost = {
  id: "test-post-id",
  room_id: "test-room-id",
  author_id: "test-user-id-123",
  title: "Welcome to the forum!",
  content: "This is a test post.",
  is_pinned: false,
  is_locked: false,
  likes_count: 0,
};

export const testPayment = {
  id: "test-payment-id",
  user_id: "test-user-id-123",
  amount: 299.99,
  currency: "EUR",
  status: "succeeded",
  payment_method: "manual",
  notes: "Cash payment",
};

export const testDiscountCode = {
  id: "test-discount-id",
  code: "WELCOME20",
  discount_type: "percentage",
  discount_value: 20,
  is_active: true,
  valid_from: new Date().toISOString(),
  valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
  max_uses: 100,
  current_uses: 0,
  created_by: "test-admin-id-789",
};

// Helper functions for test data generation
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateTestEmail = (): string => {
  return `test-${Date.now()}@example.com`;
};

export const createMockEvent = (overrides?: Partial<typeof testEvent>) => ({
  ...testEvent,
  id: generateUUID(),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<typeof testUser>) => ({
  ...testUser,
  id: generateUUID(),
  email: generateTestEmail(),
  ...overrides,
});
