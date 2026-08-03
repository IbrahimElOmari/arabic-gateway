import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_recent_attempts",
  title: "List my recent attempts",
  description: "List the signed-in student's most recent curriculum exercise attempts with score and correctness.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of attempts to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("curriculum_item_attempts")
      .select("*")
      .eq("student_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { attempts: data ?? [] },
    };
  },
});
