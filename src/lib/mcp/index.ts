import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCurriculumUnits from "./tools/list-curriculum-units";
import listUnitExercises from "./tools/list-unit-exercises";
import getMyProgress from "./tools/get-my-progress";
import listMyRecentAttempts from "./tools/list-my-recent-attempts";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "arabic-gateway",
  title: "Arabic Gateway",
  version: "0.1.0",
  instructions:
    "Tools for Arabic Gateway, an Arabic learning platform. Browse curriculum units and their published exercises, and read the signed-in student's progress and recent attempts. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCurriculumUnits, listUnitExercises, getMyProgress, listMyRecentAttempts],
});
