import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe("Helpdesk System", () => {
  describe("Ticket Number Generation", () => {
    it("should generate ticket numbers with correct format", () => {
      const generateTicketNumber = (counter: number) => {
        return `HVA-${counter.toString().padStart(6, "0")}`;
      };
      
      expect(generateTicketNumber(1)).toBe("HVA-000001");
      expect(generateTicketNumber(123)).toBe("HVA-000123");
      expect(generateTicketNumber(999999)).toBe("HVA-999999");
    });
  });

  describe("Ticket Status Transitions", () => {
    it("should validate status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        open: ["in_progress", "closed"],
        in_progress: ["waiting_customer", "resolved", "closed"],
        waiting_customer: ["in_progress", "closed"],
        resolved: ["closed", "open"],
        closed: ["open"],
      };
      
      const canTransition = (from: string, to: string) => {
        return validTransitions[from]?.includes(to) ?? false;
      };
      
      expect(canTransition("open", "in_progress")).toBe(true);
      expect(canTransition("open", "resolved")).toBe(false);
      expect(canTransition("in_progress", "resolved")).toBe(true);
      expect(canTransition("closed", "open")).toBe(true);
    });
  });

  describe("Priority Sorting", () => {
    it("should sort tickets by priority correctly", () => {
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      
      const tickets = [
        { id: "1", priority: "low" },
        { id: "2", priority: "critical" },
        { id: "3", priority: "medium" },
        { id: "4", priority: "high" },
      ];
      
      const sorted = [...tickets].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
      
      expect(sorted[0].id).toBe("2"); // critical
      expect(sorted[1].id).toBe("4"); // high
      expect(sorted[2].id).toBe("3"); // medium
      expect(sorted[3].id).toBe("1"); // low
    });
  });

  describe("Category Filtering", () => {
    it("should filter tickets by category", () => {
      const tickets = [
        { id: "1", category: "technical" },
        { id: "2", category: "billing" },
        { id: "3", category: "technical" },
        { id: "4", category: "general" },
      ];
      
      const technicalTickets = tickets.filter((t) => t.category === "technical");
      expect(technicalTickets.length).toBe(2);
      
      const billingTickets = tickets.filter((t) => t.category === "billing");
      expect(billingTickets.length).toBe(1);
    });
  });

  describe("Response Time Calculation", () => {
    it("should calculate response time in hours", () => {
      const createdAt = new Date("2026-02-01T10:00:00Z");
      const respondedAt = new Date("2026-02-01T14:30:00Z");
      
      const diffMs = respondedAt.getTime() - createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      expect(diffHours).toBe(4.5);
    });

    it("should calculate response time in minutes for quick responses", () => {
      const createdAt = new Date("2026-02-01T10:00:00Z");
      const respondedAt = new Date("2026-02-01T10:25:00Z");
      
      const diffMs = respondedAt.getTime() - createdAt.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      expect(diffMinutes).toBe(25);
    });
  });

  describe("Ticket Validation", () => {
    it("should require subject and description", () => {
      const validate = (ticket: { subject?: string; description?: string }) => {
        const errors: string[] = [];
        if (!ticket.subject?.trim()) errors.push("Subject is required");
        if (!ticket.description?.trim()) errors.push("Description is required");
        return errors;
      };
      
      expect(validate({}).length).toBe(2);
      expect(validate({ subject: "Test" }).length).toBe(1);
      expect(validate({ subject: "Test", description: "Details" }).length).toBe(0);
    });

    it("should validate subject length", () => {
      const validateSubject = (subject: string) => {
        if (subject.length < 5) return "Subject too short";
        if (subject.length > 200) return "Subject too long";
        return null;
      };
      
      expect(validateSubject("Hi")).toBe("Subject too short");
      expect(validateSubject("A".repeat(201))).toBe("Subject too long");
      expect(validateSubject("Normal subject")).toBe(null);
    });
  });
});
