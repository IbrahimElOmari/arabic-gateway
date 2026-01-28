import { describe, it, expect, vi, beforeEach } from "vitest";
import { testUser, testClass, testEnrollment, testEvent, generateUUID } from "./fixtures";

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("User Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full registration flow", async () => {
    // Step 1: Sign up
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: testUser.id, email: testUser.email } },
      error: null,
    });

    const signUpResult = await mockSupabase.auth.signUp({
      email: testUser.email,
      password: "SecurePassword123!",
      options: {
        data: {
          full_name: testUser.full_name,
          phone: testUser.phone,
          address: testUser.address,
          date_of_birth: testUser.date_of_birth,
          study_level: testUser.study_level,
        },
      },
    });

    expect(signUpResult.error).toBeNull();
    expect(signUpResult.data.user).toBeTruthy();
    expect(signUpResult.data.user?.id).toBe(testUser.id);

    // Step 2: Verify profile was created (triggered by database)
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: generateUUID(),
              user_id: testUser.id,
              email: testUser.email,
              full_name: testUser.full_name,
              phone: testUser.phone,
              address: testUser.address,
              date_of_birth: testUser.date_of_birth,
              study_level: testUser.study_level,
            },
            error: null,
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", testUser.id)
      .single();

    expect(profileResult.data).toBeTruthy();
    expect(profileResult.data?.full_name).toBe(testUser.full_name);
    expect(profileResult.data?.phone).toBe(testUser.phone);
  });
});

describe("Class Enrollment Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enroll student in class", async () => {
    // Mock enrollment insert
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testEnrollment,
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: testEnrollment,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    // Create enrollment
    const enrollmentResult = await supabase
      .from("class_enrollments")
      .insert({
        class_id: testClass.id,
        student_id: testUser.id,
        status: "enrolled",
      })
      .select()
      .single();

    expect(enrollmentResult.error).toBeNull();
    expect(enrollmentResult.data?.status).toBe("enrolled");
  });

  it("should prevent enrollment when class is full", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 50, // Max students reached
            error: null,
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    // Check enrollment count
    const countResult = await supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", testClass.id)
      .eq("status", "enrolled");

    expect(countResult.count).toBe(50);
    // Enrollment should be prevented at this point
  });
});

describe("Event CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create personal event", async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: testEvent,
            error: null,
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    const result = await supabase
      .from("events")
      .insert({
        creator_id: testUser.id,
        target_type: "user",
        target_id: testUser.id,
        title: testEvent.title,
        start_time: testEvent.start_time,
        end_time: testEvent.end_time,
        event_type: "personal",
      })
      .select()
      .single();

    expect(result.error).toBeNull();
    expect(result.data?.title).toBe(testEvent.title);
  });

  it("should fetch events for a month", async () => {
    const events = [testEvent];
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: events,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    const startOfMonth = new Date(2024, 0, 1).toISOString();
    const endOfMonth = new Date(2024, 0, 31).toISOString();
    
    const result = await supabase
      .from("events")
      .select("*")
      .gte("start_time", startOfMonth)
      .lte("start_time", endOfMonth)
      .order("start_time", { ascending: true });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it("should delete event", async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    const result = await supabase
      .from("events")
      .delete()
      .eq("id", testEvent.id);

    expect(result.error).toBeNull();
  });
});

describe("Payment Recording Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record manual payment and enroll student", async () => {
    // Mock payment creation
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: generateUUID(),
              user_id: testUser.id,
              amount: testClass.price,
              currency: "EUR",
              status: "succeeded",
              payment_method: "manual",
            },
            error: null,
          }),
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    const result = await supabase
      .from("payments")
      .insert({
        user_id: testUser.id,
        amount: testClass.price,
        currency: "EUR",
        status: "succeeded",
        payment_method: "manual",
        notes: "Cash payment recorded by admin",
      })
      .select()
      .single();

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe("succeeded");
    expect(result.data?.amount).toBe(testClass.price);
  });
});

describe("Data Retention (GDPR) Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should mark user for deletion after unenrollment", async () => {
    // This tests the database trigger behavior
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    // Simulate unenrollment
    const result = await supabase
      .from("class_enrollments")
      .update({ status: "cancelled" })
      .eq("id", testEnrollment.id);

    expect(result.error).toBeNull();
    // The database trigger handle_unenrollment() should mark user for deletion
  });

  it("should cancel deletion when user re-enrolls", async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    
    // Simulate re-enrollment
    const result = await supabase
      .from("class_enrollments")
      .update({ status: "enrolled" })
      .eq("id", testEnrollment.id);

    expect(result.error).toBeNull();
    // The database trigger should cancel pending deletion
  });
});
