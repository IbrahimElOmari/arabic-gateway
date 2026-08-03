import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_unit_exercises",
  title: "List exercises in a unit",
  description: "List the published curriculum exercises of one unit, without revealing the correct answers.",
  inputSchema: {
    unit_code: z.string().trim().min(1).describe("Unit code, e.g. U1."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum number of exercises to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unit_code, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("curriculum_items")
      .select("item_id, unit_code, week, skill, exercise_type, exercise_subtype, question, instruction_nl, points, display_order")
      .eq("unit_code", unit_code)
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .limit(limit);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { exercises: data ?? [] },
    };
  },
});
