import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDate } from "@/lib/date-utils";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, UserCog, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { logAdminAction } from "@/lib/admin-log";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "teacher" | "student";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  role?: AppRole;
}

interface ClassOption {
  id: string;
  name: string;
  level_name?: string;
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("student");
  const [selectedClassId, setSelectedClassId] = useState<string>("none");

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery, roleFilter],
    queryFn: async () => {
      let profiles: any[];
      if (searchQuery) {
        profiles = await apiQuery<any[]>("profiles", (q) =>
          q.select("id, user_id, full_name, email, created_at")
            .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
            .order("created_at", { ascending: false })
        );
      } else {
        profiles = await apiQuery<any[]>("profiles", (q) =>
          q.select("id, user_id, full_name, email, created_at").order("created_at", { ascending: false })
        );
      }

      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const roleData = await apiQuery<any>("user_roles", (q) =>
            q.select("role").eq("user_id", profile.user_id).maybeSingle()
          );
          return { ...profile, role: roleData?.role as AppRole | undefined };
        })
      );

      if (roleFilter !== "all") return usersWithRoles.filter((u) => u.role === roleFilter);
      return usersWithRoles;
    },
  });

  // Fetch active classes for class assignment
  const { data: classes = [] } = useQuery<ClassOption[]>({
    queryKey: ["admin-classes-for-assignment"],
    queryFn: async () => {
      const data = await apiQuery<any[]>("classes", (q) =>
        q.select("id, name, level:levels(name)").eq("is_active", true).order("name")
      );
      return (data || []).map((c: any) => ({ id: c.id, name: c.name, level_name: c.level?.name }));
    },
  });

  // Update user role + optional class enrollment
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, classId }: { userId: string; role: AppRole; classId?: string }) => {
      await apiMutate("user_roles", (q) => q.delete().eq("user_id", userId));
      await apiMutate("user_roles", (q) => q.insert({ user_id: userId, role }));

      if (classId && (role === "teacher" || role === "student")) {
        if (role === "teacher") {
          await apiMutate("classes", (q) => q.update({ teacher_id: userId }).eq("id", classId));
        } else {
          await apiMutate("class_enrollments", (q) =>
            q.upsert({ student_id: userId, class_id: classId, status: "enrolled" }, { onConflict: "student_id,class_id" })
          );
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (adminUser) logAdminAction(adminUser.id, "update_role", "user_roles", variables.userId, { role: variables.role, class_id: variables.classId });
      toast({
        title: t("admin.roleUpdated", "Role Updated"),
        description: t("admin.roleUpdatedDescription", "User role has been updated successfully."),
      });
      setSelectedUser(null);
      setSelectedClassId("none");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.roleUpdateError", "Failed to update user role."),
      });
    },
  });

  const handleRoleChange = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({
        userId: selectedUser.user_id,
        role: newRole,
        classId: selectedClassId !== "none" ? selectedClassId : undefined,
      });
    }
  };

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "teacher":
        return "default";
      default:
        return "secondary";
    }
  };

  const showClassSelector = newRole === "teacher" || newRole === "student";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.userManagement", "User Management")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.userManagementDescription", "Manage user accounts and roles")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.searchUsers", "Search users...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("admin.filterByRole", "Filter by role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allRoles", "All Roles")}</SelectItem>
            <SelectItem value="admin">{t("admin.admin", "Admin")}</SelectItem>
            <SelectItem value="teacher">{t("admin.teacher", "Teacher")}</SelectItem>
            <SelectItem value="student">{t("admin.student", "Student")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.name", "Name")}</TableHead>
              <TableHead>{t("admin.email", "Email")}</TableHead>
              <TableHead>{t("admin.role", "Role")}</TableHead>
              <TableHead>{t("admin.joinedDate", "Joined")}</TableHead>
              <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role || "student"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(user.created_at, "PP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role || "student");
                        setSelectedClassId("none");
                      }}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      {t("admin.editRole", "Edit Role")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("admin.noUsersFound", "No users found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setSelectedClassId("none"); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUserRole", "Edit User Role")}</DialogTitle>
            <DialogDescription>
              {t("admin.editUserRoleDescription", "Change the role for")} {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.role", "Role")}</Label>
              <Select value={newRole} onValueChange={(v) => { setNewRole(v as AppRole); setSelectedClassId("none"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t("admin.student", "Student")}</SelectItem>
                  <SelectItem value="teacher">{t("admin.teacher", "Teacher")}</SelectItem>
                  <SelectItem value="admin">{t("admin.admin", "Admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showClassSelector && (
              <div className="space-y-2">
                <Label>
                  {newRole === "teacher"
                    ? t("admin.assignToClass", "Assign to class (optional)")
                    : t("admin.enrollInClass", "Enroll in class (optional)")}
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.selectClass", "Select a class...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.noClass", "No class")}</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}{cls.level_name ? ` (${cls.level_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newRole === "teacher"
                    ? t("admin.assignToClassHelp", "The teacher will be assigned as the instructor of this class.")
                    : t("admin.enrollInClassHelp", "The student will be enrolled in this class.")}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedUser(null); setSelectedClassId("none"); }}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
