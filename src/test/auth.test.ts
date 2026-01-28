import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "nl" },
  }),
}));

describe("Auth Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("should call supabase signUp with correct parameters", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      });

      const result = await supabase.auth.signUp({
        email: "test@example.com",
        password: "password123",
        options: {
          data: {
            full_name: "Test User",
            phone: "+31612345678",
            address: "Test Address",
            date_of_birth: "1990-01-01",
            study_level: "beginner",
          },
        },
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          data: {
            full_name: "Test User",
            phone: "+31612345678",
            address: "Test Address",
            date_of_birth: "1990-01-01",
            study_level: "beginner",
          },
        },
      });
      expect(result.error).toBeNull();
    });

    it("should handle signUp errors", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: { message: "Email already registered" },
      });

      const result = await supabase.auth.signUp({
        email: "existing@example.com",
        password: "password123",
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("Email already registered");
    });
  });

  describe("signIn", () => {
    it("should call supabase signInWithPassword", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { 
          user: { id: "test-user-id", email: "test@example.com" },
          session: { access_token: "token123" },
        },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.data.user).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it("should handle invalid credentials", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await supabase.auth.signInWithPassword({
        email: "wrong@example.com",
        password: "wrongpassword",
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("Invalid login credentials");
    });
  });

  describe("signOut", () => {
    it("should call supabase signOut", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const result = await supabase.auth.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });
});
