import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_curriculum_units",
  title: "List curriculum units",
  description: "List the curriculum units (weeks/themes) of the Arabic course, ordered by display order.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("curriculum_units")
      .select("code, title_nl, title_en, title_ar, description_nl, cefr_from, cefr_to, week_start, week_end, display_order")
      .order("display_order", { ascending: true });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { units: data ?? [] },
    };
  },
});
