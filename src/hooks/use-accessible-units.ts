import { useQuery } from "@tanstack/react-query";
import { apiRpc } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessibleUnit {
  unit_code: string;
  level_id: string | null;
  is_accessible: boolean;
  unlock_date: string | null;
}

/** Units of the student's level with lock state (staff: all units open). */
export function useAccessibleUnits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-accessible-units", user?.id],
    enabled: !!user,
    queryFn: () => apiRpc<AccessibleUnit[]>("get_my_accessible_units"),
  });
}

/** null = still loading */
export function useUnitAccess(unitCode: string | undefined) {
  const { isAdmin, isTeacher } = useAuth();
  const q = useAccessibleUnits();
  if (isAdmin || isTeacher) return { allowed: true as boolean | null, unit: undefined };
  if (!unitCode || q.isLoading) return { allowed: null, unit: undefined };
  const unit = (q.data ?? []).find((u) => u.unit_code === unitCode);
  return { allowed: !!unit?.is_accessible, unit };
}
